import { Component, OnInit, inject, model, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';

import { VaultCategoryApiService } from '../../../core/services/vault-category-api.service';
import { VaultCategory } from '../../../core/models/vault.model';

const PRESET_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
];

@Component({
  selector: 'app-vault-category-manager',
  standalone: true,
  imports: [ReactiveFormsModule, DialogModule, ButtonModule, InputTextModule],
  templateUrl: './vault-category-manager.html',
  styleUrl: './vault-category-manager.scss',
})
export class VaultCategoryManager implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly vaultCategoryApi = inject(VaultCategoryApiService);

  visible = model<boolean>(false);
  categoriesChanged = output<void>();

  protected readonly presetColors = PRESET_COLORS;

  protected readonly categories = signal<VaultCategory[]>([]);
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    color: [PRESET_COLORS[0]],
  });

  ngOnInit(): void {
    this.loadCategories();
  }

  private loadCategories(): void {
    this.loading.set(true);

    this.vaultCategoryApi.getCategories().subscribe({
      next: (categories) => {
        this.categories.set(categories);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected startCreate(): void {
    this.editingId.set(null);
    this.errorMessage.set(null);
    this.form.reset({ name: '', color: PRESET_COLORS[0] });
  }

  protected startEdit(category: VaultCategory): void {
    this.editingId.set(category.id);
    this.errorMessage.set(null);
    this.form.setValue({ name: category.name, color: category.color ?? PRESET_COLORS[0] });
  }

  protected selectColor(color: string): void {
    this.form.controls.color.setValue(color);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    const request = this.form.getRawValue();
    const id = this.editingId();

    const request$ = id
      ? this.vaultCategoryApi.updateCategory(id, request)
      : this.vaultCategoryApi.createCategory(request);

    request$.subscribe({
      next: () => {
        this.submitting.set(false);
        this.startCreate();
        this.loadCategories();
        this.categoriesChanged.emit();
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(err?.error?.message ?? 'Unable to save this category.');
      },
    });
  }

  protected deleteCategory(id: string): void {
    this.vaultCategoryApi.deleteCategory(id).subscribe({
      next: () => {
        if (this.editingId() === id) {
          this.startCreate();
        }
        this.loadCategories();
        this.categoriesChanged.emit();
      },
    });
  }
}
