import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import {
  BudgetResponse,
  CategoryComparison,
  CategoryResponse,
  CreateBudgetRequest,
  UpdateBudgetRequest,
} from '../../../core/models/finance.model';
import { FinanceAnalyticsApiService } from '../../../core/services/finance-analytics-api.service';
import { FinanceBudgetApiService } from '../../../core/services/finance-budget-api.service';
import { FinanceCategoryApiService } from '../../../core/services/finance-category-api.service';
import { BudgetDialog } from './budget-dialog/budget-dialog';

type Status = 'on-track' | 'near-limit' | 'over';

interface BudgetCard {
  budget: BudgetResponse;
  categoryName: string;
  spend: number;
  pct: number;
  status: Status;
  statusText: string;
  borderClass: string;
  barClass: string;
}

interface UncappedCategory {
  id: string;
  name: string;
  spend: number;
}

@Component({
  selector: 'app-finance-budgets',
  standalone: true,
  imports: [CurrencyPipe, BudgetDialog],
  templateUrl: './budgets.html',
  styleUrl: './budgets.scss',
})
export class FinanceBudgets implements OnInit {
  private readonly budgetApi = inject(FinanceBudgetApiService);
  private readonly categoryApi = inject(FinanceCategoryApiService);
  private readonly analyticsApi = inject(FinanceAnalyticsApiService);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly budgets = signal<BudgetResponse[]>([]);
  protected readonly categories = signal<CategoryResponse[]>([]);
  protected readonly comparisons = signal<Map<string, CategoryComparison>>(new Map());

  protected readonly dialogVisible = signal(false);
  protected readonly editingBudget = signal<BudgetResponse | null>(null);

  protected readonly categoryMap = computed(() => new Map(this.categories().map((c) => [c.id, c])));

  protected readonly budgetCards = computed<BudgetCard[]>(() => {
    const categoryMap = this.categoryMap();
    const comparisons = this.comparisons();

    return this.budgets().map((b): BudgetCard => {
      const spend = comparisons.get(b.categoryId)?.currentMonthSpend ?? 0;
      const pct = b.budgetAmount > 0 ? (spend / b.budgetAmount) * 100 : 0;
      const threshold = b.alertThreshold > 0 ? b.alertThreshold : 80;

      let status: Status = 'on-track';
      if (pct >= 100) status = 'over';
      else if (pct >= threshold) status = 'near-limit';

      const remaining = b.budgetAmount - spend;
      const statusText =
        status === 'over'
          ? `₹${Math.abs(remaining).toLocaleString('en-IN')} over budget`
          : `₹${remaining.toLocaleString('en-IN')} left`;

      return {
        budget: b,
        categoryName: categoryMap.get(b.categoryId)?.name ?? 'Uncategorized',
        spend,
        pct: Math.min(pct, 100),
        status,
        statusText,
        borderClass:
          status === 'over' ? 'border-destructive/32' : status === 'near-limit' ? 'border-warning/30' : 'border-border',
        barClass: status === 'over' ? 'bg-destructive' : status === 'near-limit' ? 'bg-warning' : 'bg-primary',
      };
    });
  });

  protected readonly totalBudgeted = computed(() => this.budgets().reduce((sum, b) => sum + b.budgetAmount, 0));
  protected readonly totalSpent = computed(() => this.budgetCards().reduce((sum, c) => sum + c.spend, 0));
  protected readonly totalPct = computed(() =>
    this.totalBudgeted() > 0 ? Math.min((this.totalSpent() / this.totalBudgeted()) * 100, 100) : 0,
  );

  protected readonly onTrackCount = computed(() => this.budgetCards().filter((c) => c.status === 'on-track').length);
  protected readonly nearLimitCount = computed(() => this.budgetCards().filter((c) => c.status === 'near-limit').length);
  protected readonly overCount = computed(() => this.budgetCards().filter((c) => c.status === 'over').length);

  protected readonly uncappedCategories = computed<UncappedCategory[]>(() => {
    const budgetedIds = new Set(this.budgets().map((b) => b.categoryId));
    const comparisons = this.comparisons();
    return this.categories()
      .filter((c) => c.type === 'EXPENSE' && !budgetedIds.has(c.id))
      .map((c) => ({ id: c.id, name: c.name, spend: comparisons.get(c.id)?.currentMonthSpend ?? 0 }))
      .filter((c) => c.spend > 0)
      .sort((a, b) => b.spend - a.spend);
  });

  ngOnInit(): void {
    forkJoin({
      budgets: this.budgetApi.getBudgets().pipe(catchError(() => of([] as BudgetResponse[]))),
      categories: this.categoryApi.getCategories().pipe(catchError(() => of([] as CategoryResponse[]))),
    }).subscribe(({ budgets, categories }) => {
      this.budgets.set(budgets);
      this.categories.set(categories);

      const expenseCategoryIds = categories.filter((c) => c.type === 'EXPENSE').map((c) => c.id);
      const budgetCategoryIds = budgets.map((b) => b.categoryId);
      const targets = [...new Set([...expenseCategoryIds, ...budgetCategoryIds])];

      if (targets.length === 0) {
        this.loading.set(false);
        return;
      }

      forkJoin(
        targets.map((categoryId) =>
          this.analyticsApi.getCategoryComparison(categoryId).pipe(
            catchError(() =>
              of({ categoryId, currentMonthSpend: 0, lastMonthSpend: 0, difference: 0, percentageChange: 0 }),
            ),
          ),
        ),
      ).subscribe((comparisons) => {
        this.comparisons.set(new Map(comparisons.map((c) => [c.categoryId, c])));
        this.loading.set(false);
      });
    });
  }

  protected openCreate(): void {
    this.editingBudget.set(null);
    this.dialogVisible.set(true);
  }

  protected openEdit(card: BudgetCard): void {
    this.editingBudget.set(card.budget);
    this.dialogVisible.set(true);
  }

  protected createBudget(request: CreateBudgetRequest): void {
    this.budgetApi.createBudget(request).subscribe({
      next: (budget) => this.budgets.update((rows) => [...rows, budget]),
      error: (err) => this.errorMessage.set(this.extractError(err)),
    });
  }

  protected updateBudget(event: { id: string; request: UpdateBudgetRequest }): void {
    this.budgetApi.updateBudget(event.id, event.request).subscribe({
      next: (updated) => this.budgets.update((rows) => rows.map((b) => (b.id === updated.id ? updated : b))),
      error: (err) => this.errorMessage.set(this.extractError(err)),
    });
  }

  protected deleteBudget(card: BudgetCard): void {
    this.budgetApi.deleteBudget(card.budget.id).subscribe({
      next: () => this.budgets.update((rows) => rows.filter((b) => b.id !== card.budget.id)),
      error: (err) => this.errorMessage.set(this.extractError(err)),
    });
  }

  private extractError(err: unknown): string {
    const httpError = err as { error?: { message?: string } };
    return httpError?.error?.message ?? 'That action failed. Please try again.';
  }
}
