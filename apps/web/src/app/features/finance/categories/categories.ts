import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { CategoryResponse } from '../../../core/models/finance.model';
import { FinanceCategoryApiService } from '../../../core/services/finance-category-api.service';
import { CategoryDialog } from '../category-dialog/category-dialog';

@Component({
  selector: 'app-finance-categories',
  standalone: true,
  imports: [CategoryDialog],
  templateUrl: './categories.html',
  styleUrl: './categories.scss',
})
export class FinanceCategories implements OnInit {
  private readonly categoryApi = inject(FinanceCategoryApiService);

  protected readonly loading = signal(true);
  protected readonly categories = signal<CategoryResponse[]>([]);

  protected readonly dialogVisible = signal(false);
  protected readonly editingCategory = signal<CategoryResponse | null>(null);

  protected readonly grouped = computed(() => {
    const cats = this.categories();
    return {
      EXPENSE: cats.filter((c) => c.type === 'EXPENSE'),
      INCOME: cats.filter((c) => c.type === 'INCOME'),
      TRANSFER: cats.filter((c) => c.type === 'TRANSFER'),
      INVESTMENT: cats.filter((c) => c.type === 'INVESTMENT'),
    };
  });

  ngOnInit(): void {
    this.categoryApi.getCategories().subscribe({
      next: (categories) => {
        this.categories.set(categories);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected openCreate(): void {
    this.editingCategory.set(null);
    this.dialogVisible.set(true);
  }

  protected openEdit(category: CategoryResponse): void {
    this.editingCategory.set(category);
    this.dialogVisible.set(true);
  }

  protected onCreated(category: CategoryResponse): void {
    this.categories.update((rows) => [...rows, category]);
  }

  protected onUpdated(category: CategoryResponse): void {
    this.categories.update((rows) => rows.map((c) => (c.id === category.id ? category : c)));
  }

  protected deleteCategory(category: CategoryResponse): void {
    this.categoryApi.deleteCategory(category.id).subscribe({
      next: () => this.categories.update((rows) => rows.filter((c) => c.id !== category.id)),
      error: () => undefined,
    });
  }
}
