import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import {
  BudgetResponse,
  CategoryComparison,
  CategoryResponse,
  DashboardSummary,
} from '../../../core/models/finance.model';
import { FinanceAnalyticsApiService } from '../../../core/services/finance-analytics-api.service';
import { FinanceBudgetApiService } from '../../../core/services/finance-budget-api.service';
import { FinanceCategoryApiService } from '../../../core/services/finance-category-api.service';
import { FinanceReportApiService } from '../../../core/services/finance-report-api.service';

interface ExpenseSegment {
  name: string;
  amount: number;
  pct: number;
  colorClass: string;
}

interface BudgetPerformanceRow {
  categoryName: string;
  spend: number;
  cap: number;
  statusLabel: string;
  statusClass: string;
}

interface MoMRow {
  categoryName: string;
  lastMonth: number;
  currentMonth: number;
  changeClass: string;
}

const SEGMENT_COLORS = ['bg-primary', 'bg-primary/70', 'bg-warning', 'bg-danger-alt', 'bg-primary/40', 'bg-foreground/30'];

@Component({
  selector: 'app-finance-report',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe, RouterLink],
  templateUrl: './report.html',
  styleUrl: './report.scss',
})
export class FinanceReport implements OnInit {
  private readonly analyticsApi = inject(FinanceAnalyticsApiService);
  private readonly budgetApi = inject(FinanceBudgetApiService);
  private readonly categoryApi = inject(FinanceCategoryApiService);
  private readonly reportApi = inject(FinanceReportApiService);

  protected readonly loading = signal(true);
  protected readonly exporting = signal(false);

  protected readonly monthLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  protected readonly summary = signal<DashboardSummary>({ totalIncome: null, totalExpenses: null, savings: 0, fixedMonthlyIncome: null });
  protected readonly comparisons = signal<{ category: CategoryResponse; comparison: CategoryComparison }[]>([]);
  protected readonly budgets = signal<BudgetResponse[]>([]);

  // Savings rate is measured against the fixed salary, not the CREDIT sum -
  // totalIncome includes one-off transfers/refunds, which aren't real income.
  protected readonly effectiveIncome = computed(() => this.summary().fixedMonthlyIncome ?? 0);
  protected readonly netSavedPct = computed(() => {
    const income = this.effectiveIncome();
    return income > 0 ? (this.summary().savings / income) * 100 : 0;
  });

  protected readonly expenseSegments = computed<ExpenseSegment[]>(() => {
    const rows = this.comparisons()
      .filter((c) => c.comparison.currentMonthSpend > 0)
      .sort((a, b) => b.comparison.currentMonthSpend - a.comparison.currentMonthSpend);
    const total = rows.reduce((sum, r) => sum + r.comparison.currentMonthSpend, 0) || 1;
    return rows.map((r, i) => ({
      name: r.category.name,
      amount: r.comparison.currentMonthSpend,
      pct: (r.comparison.currentMonthSpend / total) * 100,
      colorClass: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
    }));
  });

  protected readonly budgetPerformance = computed<BudgetPerformanceRow[]>(() => {
    const categoryMap = new Map(this.comparisons().map((c) => [c.category.id, c.comparison]));
    return this.budgets().map((b): BudgetPerformanceRow => {
      const spend = categoryMap.get(b.categoryId)?.currentMonthSpend ?? 0;
      const pct = b.budgetAmount > 0 ? (spend / b.budgetAmount) * 100 : 0;
      const categoryName = this.comparisons().find((c) => c.category.id === b.categoryId)?.category.name ?? 'Uncategorized';
      const over = pct >= 100;
      return {
        categoryName,
        spend,
        cap: b.budgetAmount,
        statusLabel: over ? `${(pct - 100).toFixed(0)}% over` : `${pct.toFixed(0)}% used`,
        statusClass: over ? 'text-destructive' : pct >= b.alertThreshold ? 'text-warning' : 'text-primary',
      };
    });
  });

  protected readonly monthOverMonth = computed<MoMRow[]>(() =>
    this.comparisons()
      .filter((c) => c.comparison.currentMonthSpend > 0 || c.comparison.lastMonthSpend > 0)
      .sort((a, b) => b.comparison.currentMonthSpend - a.comparison.currentMonthSpend)
      .slice(0, 8)
      .map((c) => ({
        categoryName: c.category.name,
        lastMonth: c.comparison.lastMonthSpend,
        currentMonth: c.comparison.currentMonthSpend,
        changeClass:
          c.comparison.currentMonthSpend > c.comparison.lastMonthSpend
            ? 'text-warning'
            : c.comparison.currentMonthSpend < c.comparison.lastMonthSpend
              ? 'text-primary'
              : 'text-foreground/60',
      })),
  );

  protected readonly insights = computed(() => {
    const items: string[] = [];
    const rows = this.comparisons().filter((c) => c.comparison.lastMonthSpend > 0);
    const biggest = [...rows].sort((a, b) => b.comparison.percentageChange - a.comparison.percentageChange)[0];
    if (biggest && biggest.comparison.percentageChange > 0) {
      items.push(
        `${biggest.category.name} rose ${biggest.comparison.percentageChange.toFixed(0)}% from last month, now ₹${biggest.comparison.currentMonthSpend.toLocaleString('en-IN')}.`,
      );
    }
    const overBudget = this.budgetPerformance().filter((b) => b.statusClass === 'text-destructive');
    if (overBudget.length > 0) {
      items.push(`${overBudget.length} budget${overBudget.length === 1 ? ' is' : 's are'} over cap this month.`);
    }
    if (this.netSavedPct() > 0) {
      items.push(`You saved ${this.netSavedPct().toFixed(1)}% of income this period.`);
    }
    return items;
  });

  ngOnInit(): void {
    forkJoin({
      summary: this.analyticsApi
        .getDashboardSummary()
        .pipe(catchError(() => of({ totalIncome: null, totalExpenses: null, savings: 0, fixedMonthlyIncome: null }))),
      categories: this.categoryApi.getCategories().pipe(catchError(() => of([] as CategoryResponse[]))),
      budgets: this.budgetApi.getBudgets().pipe(catchError(() => of([] as BudgetResponse[]))),
    }).subscribe(({ summary, categories, budgets }) => {
      this.summary.set(summary);
      this.budgets.set(budgets);

      const expenseCategories = categories.filter((c) => c.type === 'EXPENSE');
      if (expenseCategories.length === 0) {
        this.loading.set(false);
        return;
      }

      forkJoin(
        expenseCategories.map((category) =>
          this.analyticsApi.getCategoryComparison(category.id).pipe(
            catchError(() =>
              of({ categoryId: category.id, currentMonthSpend: 0, lastMonthSpend: 0, difference: 0, percentageChange: 0 }),
            ),
          ),
        ),
      ).subscribe((comparisons) => {
        this.comparisons.set(expenseCategories.map((category, i) => ({ category, comparison: comparisons[i] })));
        this.loading.set(false);
      });
    });
  }

  protected exportPdf(): void {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const toIso = (d: Date) => d.toISOString().slice(0, 10);

    this.exporting.set(true);
    this.reportApi.getCustomReport(toIso(start), toIso(end)).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'custom-report.pdf';
        a.click();
        URL.revokeObjectURL(url);
        this.exporting.set(false);
      },
      error: () => this.exporting.set(false),
    });
  }

  protected readonly exportingTax = signal(false);
  // Indian financial year runs Apr 1 - Mar 31, so before April this year's FY
  // started last calendar year.
  protected readonly taxYear = signal(
    new Date().getMonth() < 3 ? new Date().getFullYear() - 1 : new Date().getFullYear(),
  );
  protected readonly taxYearLabel = computed(() => `FY ${this.taxYear()}-${String(this.taxYear() + 1).slice(2)}`);

  protected exportTaxCsv(): void {
    this.exportingTax.set(true);
    this.reportApi.getTaxReport(this.taxYear()).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tax-report-fy${this.taxYear()}-${String(this.taxYear() + 1).slice(2)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        this.exportingTax.set(false);
      },
      error: () => this.exportingTax.set(false),
    });
  }
}
