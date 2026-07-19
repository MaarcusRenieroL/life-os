import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { concatMap, from, switchMap, toArray } from 'rxjs';

import { ClipboardService } from '../../../core/services/clipboard.service';
import { VaultApiService } from '../../../core/services/vault-api.service';
import { VaultCategoryApiService } from '../../../core/services/vault-category-api.service';
import { VaultStateService } from '../../../core/services/vault-state.service';
import { VaultCategory, VaultEntryDetail, VaultEntrySummary } from '../../../core/models/vault.model';
import { deriveMockSecurity, MockEntrySecurity } from '../../../core/utils/vault-mock-security.util';
import { VaultCategoryManager } from '../vault-category-manager/vault-category-manager';
import { VaultFiltersDialog } from '../vault-filters-dialog/vault-filters-dialog';
import { emptyVaultFilters, isVaultFiltersEmpty, VaultFilters } from '../vault-filters-dialog/vault-filters-dialog.model';
import { VaultEntryForm } from '../vault-entry-form/vault-entry-form';
import { PasswordGeneratorDialog } from '../password-generator-dialog/password-generator-dialog';

type QuickChip = 'all' | 'favorites' | string;

@Component({
  selector: 'app-vault-entry-list',
  standalone: true,
  imports: [
    RouterLink,
    ButtonModule,
    DialogModule,
    FormsModule,
    DatePipe,
    VaultCategoryManager,
    VaultFiltersDialog,
    VaultEntryForm,
    PasswordGeneratorDialog,
  ],
  templateUrl: './vault-entry-list.html',
  styleUrl: './vault-entry-list.scss',
})
export class VaultEntryList implements OnInit {
  private readonly vaultApi = inject(VaultApiService);
  private readonly categoryApi = inject(VaultCategoryApiService);
  protected readonly vaultState = inject(VaultStateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly clipboard = inject(ClipboardService);

  protected readonly entries = signal<VaultEntrySummary[]>([]);
  protected readonly categories = signal<VaultCategory[]>([]);
  protected readonly loading = signal(true);
  protected readonly categoryManagerVisible = signal(false);
  protected readonly filtersVisible = signal(false);
  protected readonly entryFormVisible = signal(false);
  protected readonly editingEntryId = signal<string | null>(null);
  protected readonly generatorVisible = signal(false);

  protected readonly search = signal('');
  protected readonly quickChip = signal<QuickChip>('all');
  protected readonly filters = signal<VaultFilters>(emptyVaultFilters());
  protected readonly filtersActive = computed(() => !isVaultFiltersEmpty(this.filters()));

  protected readonly selected = signal<Set<string>>(new Set());
  protected readonly openEntryId = signal<string | null>(null);
  protected readonly openEntryDetail = signal<VaultEntryDetail | null>(null);
  protected readonly showPassword = signal(false);
  protected readonly movingToFolder = signal(false);

  protected readonly mockSecurity = computed<Map<string, MockEntrySecurity>>(() =>
    deriveMockSecurity(this.entries()),
  );

  protected readonly filteredEntries = computed(() => {
    const query = this.search().trim().toLowerCase();
    const chip = this.quickChip();
    const filters = this.filters();
    const security = this.mockSecurity();

    return this.entries().filter((entry) => {
      if (query) {
        const haystack = [entry.title, entry.username, entry.email, entry.url]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) {
          return false;
        }
      }

      if (chip === 'favorites' && !entry.favorite) {
        return false;
      } else if (chip !== 'all' && chip !== 'favorites' && entry.categoryId !== chip) {
        return false;
      }

      const entrySecurity = security.get(entry.id);
      if (filters.strengths.length > 0 && !filters.strengths.includes(entrySecurity?.strength ?? 'Strong')) {
        return false;
      }
      if (filters.twoFactor.length > 0 && !filters.twoFactor.includes(entrySecurity?.twoFactor ?? 'not-supported')) {
        return false;
      }
      if (filters.categoryIds.length > 0 && !filters.categoryIds.includes(entry.categoryId ?? '')) {
        return false;
      }
      if (filters.lastUpdated !== 'any') {
        const updatedAt = new Date(entry.updatedAt).getTime();
        const ageDays = (Date.now() - updatedAt) / 86_400_000;
        if (filters.lastUpdated === '7d' && ageDays > 7) return false;
        if (filters.lastUpdated === '30d' && ageDays > 30) return false;
        if (filters.lastUpdated === '1y+' && ageDays < 365) return false;
      }

      return true;
    });
  });

  protected readonly stats = computed(() => {
    const security = this.mockSecurity();
    const entries = this.entries();
    let weak = 0;
    let duplicate = 0;
    let actionRequired = 0;

    for (const entry of entries) {
      const value = security.get(entry.id);
      if (value?.strength === 'Weak') weak++;
      if (value?.strength === 'Reused') duplicate++;
      if (value?.strength === 'Weak' || value?.strength === 'Reused') actionRequired++;
    }

    return { total: entries.length, weak, duplicate, actionRequired };
  });

  protected readonly allChecked = computed(
    () => this.filteredEntries().length > 0 && this.filteredEntries().every((e) => this.selected().has(e.id)),
  );

  ngOnInit(): void {
    this.vaultApi.getStatus().subscribe((status) => this.vaultState.setUnlocked(status.unlocked));
    this.categoryApi.getCategories().subscribe((categories) => this.categories.set(categories));
    this.loadEntries();

    // Deep link from other screens (e.g. Health's "Change now" links) that want
    // this list to land with a specific entry's edit modal already open.
    const editId = this.route.snapshot.queryParamMap.get('edit');
    if (editId) {
      this.openEditEntry(editId);
      this.router.navigate([], { relativeTo: this.route, queryParams: {} });
    }
  }

  private loadEntries(): void {
    this.vaultApi.getEntries().subscribe({
      next: (entries) => {
        this.entries.set(entries);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  refreshCategories(): void {
    this.categoryApi.getCategories().subscribe((categories) => this.categories.set(categories));
  }

  categoryName(id: string | null): string {
    if (!id) return '—';
    return this.categories().find((c) => c.id === id)?.name ?? '—';
  }

  categoryColor(id: string | null): string | null {
    if (!id) return null;
    return this.categories().find((c) => c.id === id)?.color ?? null;
  }

  security(entry: VaultEntrySummary): MockEntrySecurity {
    return this.mockSecurity().get(entry.id) ?? { strength: 'Strong', twoFactor: 'not-supported' };
  }

  strengthColorClass(strength: MockEntrySecurity['strength']): string {
    if (strength === 'Weak') return 'text-warning';
    if (strength === 'Reused') return 'text-destructive';
    return 'text-primary';
  }

  strengthDotClass(strength: MockEntrySecurity['strength']): string {
    if (strength === 'Weak') return 'bg-warning';
    if (strength === 'Reused') return 'bg-destructive';
    return 'bg-primary';
  }

  setQuickChip(chip: QuickChip): void {
    this.quickChip.set(chip);
  }

  openEntry(id: string): void {
    this.openEntryId.set(id);
    this.showPassword.set(false);
    this.openEntryDetail.set(null);
    this.vaultApi.getEntry(id).subscribe((detail) => this.openEntryDetail.set(detail));
  }

  closeEntry(): void {
    this.openEntryId.set(null);
    this.openEntryDetail.set(null);
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  editOpenEntry(): void {
    const id = this.openEntryId();
    if (id) {
      this.closeEntry();
      this.openEditEntry(id);
    }
  }

  openAddEntry(): void {
    this.editingEntryId.set(null);
    this.entryFormVisible.set(true);
  }

  openEditEntry(id: string): void {
    this.editingEntryId.set(id);
    this.entryFormVisible.set(true);
  }

  onEntrySaved(): void {
    this.loadEntries();
  }

  openGenerator(): void {
    this.generatorVisible.set(true);
  }

  copy(value: string | null | undefined, key: string): void {
    if (value) {
      this.clipboard.copyWithAutoClear(value, key);
    }
  }

  toggleSelect(id: string, event: Event): void {
    event.stopPropagation();
    this.selected.update((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  toggleSelectAll(): void {
    const allSelected = this.allChecked();
    this.selected.set(allSelected ? new Set() : new Set(this.filteredEntries().map((e) => e.id)));
  }

  clearSelection(): void {
    this.selected.set(new Set());
  }

  openCategoryManager(): void {
    this.categoryManagerVisible.set(true);
  }

  openFilters(): void {
    this.filtersVisible.set(true);
  }

  applyFilters(filters: VaultFilters): void {
    this.filters.set(filters);
  }

  deleteEntry(id: string): void {
    this.vaultApi.deleteEntry(id).subscribe(() => {
      this.selected.update((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
      this.loadEntries();
    });
  }

  deleteSelected(): void {
    const ids = [...this.selected()];
    if (ids.length === 0) return;

    from(ids)
      .pipe(
        concatMap((id) => this.vaultApi.deleteEntry(id)),
        toArray(),
      )
      .subscribe(() => {
        this.clearSelection();
        this.loadEntries();
      });
  }

  exportSelected(): void {
    const ids = this.selected();
    const rows = this.entries().filter((e) => ids.has(e.id));
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vault-export.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  moveSelectedToFolder(categoryId: string): void {
    const ids = [...this.selected()];
    if (ids.length === 0) return;

    this.movingToFolder.set(true);

    from(ids)
      .pipe(
        concatMap((id) =>
          this.vaultApi.getEntry(id).pipe(
            switchMap((detail) =>
              this.vaultApi.updateEntry(id, {
                type: detail.type,
                title: detail.title,
                email: detail.email,
                username: detail.username,
                url: detail.url,
                icon: detail.icon,
                password: detail.password,
                notes: detail.notes,
                categoryId,
                favorite: detail.favorite,
                expiresAt: detail.expiresAt,
              }),
            ),
          ),
        ),
        toArray(),
      )
      .subscribe({
        next: () => {
          this.movingToFolder.set(false);
          this.clearSelection();
          this.loadEntries();
        },
        error: () => this.movingToFolder.set(false),
      });
  }
}
