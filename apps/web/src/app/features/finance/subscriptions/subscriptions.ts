import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { CategoryResponse, MerchantResponse, RecurringPatternResponse } from '../../../core/models/finance.model';
import { FinanceCategoryApiService } from '../../../core/services/finance-category-api.service';
import { FinanceMerchantApiService } from '../../../core/services/finance-merchant-api.service';
import { FinanceRecurringPatternApiService } from '../../../core/services/finance-recurring-pattern-api.service';
import { frequencyLabel, monthlyEquivalent } from '../finance.util';
import { CategorizeDialog } from '../transactions/categorize-dialog/categorize-dialog';

type FilterId = 'all' | 'unused' | 'renewing';

const UNUSED_IDLE_DAYS = 30;
const RENEWING_SOON_DAYS = 7;

interface SubscriptionRow {
  id: string;
  initials: string;
  name: string;
  categoryName: string | null;
  amount: number;
  cycleLabel: string;
  nextRenewalLabel: string;
  nextRenewalDays: number | null;
  lastUsedLabel: string;
  idleDays: number | null;
  unused: boolean;
}

@Component({
  selector: 'app-finance-subscriptions',
  standalone: true,
  imports: [CurrencyPipe, CategorizeDialog],
  templateUrl: './subscriptions.html',
  styleUrl: './subscriptions.scss',
})
export class FinanceSubscriptions implements OnInit {
  private readonly recurringApi = inject(FinanceRecurringPatternApiService);
  private readonly merchantApi = inject(FinanceMerchantApiService);
  private readonly categoryApi = inject(FinanceCategoryApiService);

  protected readonly loading = signal(true);
  protected readonly patterns = signal<RecurringPatternResponse[]>([]);
  protected readonly merchants = signal<MerchantResponse[]>([]);
  protected readonly categories = signal<CategoryResponse[]>([]);
  protected readonly filter = signal<FilterId>('all');

  protected readonly filterChips: { id: FilterId; label: string }[] = [
    { id: 'all', label: 'All active' },
    { id: 'unused', label: 'Unused' },
    { id: 'renewing', label: 'Renewing soon' },
  ];

  protected readonly categorizeDialogVisible = signal(false);
  protected readonly categorizeTargetId = signal<string | null>(null);
  protected readonly categorizeCurrentCategoryIds = signal<string[]>([]);
  protected readonly categorizeLabel = signal('');

  protected readonly rows = computed<SubscriptionRow[]>(() => {
    const merchantMap = new Map(this.merchants().map((m) => [m.id, m]));
    const categoryMap = new Map(this.categories().map((c) => [c.id, c]));
    const now = Date.now();

    return this.patterns()
      .map((p): SubscriptionRow => {
        const merchant = merchantMap.get(p.merchantId);
        const name = merchant?.name ?? 'Unknown service';
        const idleDays = p.lastTransactionDate
          ? Math.floor((now - new Date(p.lastTransactionDate).getTime()) / 86_400_000)
          : null;
        const renewalDays = p.nextExpectedDate
          ? Math.ceil((new Date(p.nextExpectedDate).getTime() - now) / 86_400_000)
          : null;

        return {
          id: p.id,
          initials: name.slice(0, 2).toUpperCase(),
          name,
          categoryName: p.categoryId ? (categoryMap.get(p.categoryId)?.name ?? null) : null,
          amount: p.averageAmount,
          cycleLabel: frequencyLabel(p.frequency),
          nextRenewalLabel: p.nextExpectedDate
            ? new Date(p.nextExpectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : '—',
          nextRenewalDays: renewalDays,
          lastUsedLabel: idleDays === null ? 'no recent activity' : idleDays === 0 ? 'today' : `${idleDays} days ago`,
          idleDays,
          unused: idleDays !== null && idleDays >= UNUSED_IDLE_DAYS,
        };
      })
      .sort((a, b) => (a.nextRenewalDays ?? Infinity) - (b.nextRenewalDays ?? Infinity));
  });

  protected readonly filteredRows = computed(() => {
    const rows = this.rows();
    switch (this.filter()) {
      case 'unused':
        return rows.filter((r) => r.unused);
      case 'renewing':
        return rows.filter((r) => r.nextRenewalDays !== null && r.nextRenewalDays <= RENEWING_SOON_DAYS && r.nextRenewalDays >= 0);
      default:
        return rows;
    }
  });

  protected readonly monthlyTotal = computed(() =>
    this.patterns().reduce((sum, p) => sum + monthlyEquivalent(p.averageAmount, p.frequency), 0),
  );
  protected readonly yearlyTotal = computed(() => this.monthlyTotal() * 12);
  protected readonly activeCount = computed(() => this.patterns().length);
  protected readonly unusedRows = computed(() => this.rows().filter((r) => r.unused));
  protected readonly wastedMonthly = computed(() =>
    this.unusedRows().reduce((sum, r) => {
      const p = this.patterns().find((pat) => pat.id === r.id);
      return p ? sum + monthlyEquivalent(p.averageAmount, p.frequency) : sum;
    }, 0),
  );

  protected readonly renewingSoon = computed(() =>
    this.rows().filter((r) => r.nextRenewalDays !== null && r.nextRenewalDays >= 0 && r.nextRenewalDays <= RENEWING_SOON_DAYS),
  );
  protected readonly renewingSoonTotal = computed(() => this.renewingSoon().reduce((sum, r) => sum + r.amount, 0));
  protected readonly renewingSoonSummary = computed(() =>
    this.renewingSoon()
      .map((r) => `${r.name} (${r.nextRenewalLabel}, ₹${r.amount.toLocaleString('en-IN')})`)
      .join(' - '),
  );

  ngOnInit(): void {
    forkJoin({
      patterns: this.recurringApi.getPatterns().pipe(catchError(() => of([] as RecurringPatternResponse[]))),
      merchants: this.merchantApi.getMerchants().pipe(catchError(() => of([] as MerchantResponse[]))),
      categories: this.categoryApi.getCategories().pipe(catchError(() => of([] as CategoryResponse[]))),
    }).subscribe(({ patterns, merchants, categories }) => {
      this.patterns.set(patterns);
      this.merchants.set(merchants);
      this.categories.set(categories);
      this.loading.set(false);
    });
  }

  protected selectFilter(id: FilterId): void {
    this.filter.set(id);
  }

  protected openManage(row: SubscriptionRow): void {
    const pattern = this.patterns().find((p) => p.id === row.id);
    this.categorizeTargetId.set(row.id);
    this.categorizeCurrentCategoryIds.set(pattern?.categoryId ? [pattern.categoryId] : []);
    this.categorizeLabel.set(`${row.name} — set category`);
    this.categorizeDialogVisible.set(true);
  }

  protected applyCategory(categoryIds: string[]): void {
    const id = this.categorizeTargetId();
    const categoryId = categoryIds[0];
    if (!id || !categoryId) return;
    this.recurringApi.updateCategory(id, categoryId).subscribe({
      next: (updated) => this.patterns.update((rows) => rows.map((p) => (p.id === id ? updated : p))),
      error: () => undefined,
    });
  }

  protected dismiss(row: SubscriptionRow): void {
    this.recurringApi.dismiss(row.id).subscribe({
      next: () => this.patterns.update((rows) => rows.filter((p) => p.id !== row.id)),
      error: () => undefined,
    });
  }
}
