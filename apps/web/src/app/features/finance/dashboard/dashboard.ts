import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { FinanceAccountApiService } from '../../../core/services/finance-account-api.service';
import { FinanceAnalyticsApiService } from '../../../core/services/finance-analytics-api.service';
import { FinanceBudgetApiService } from '../../../core/services/finance-budget-api.service';
import { FinanceCategoryApiService } from '../../../core/services/finance-category-api.service';
import { FinanceMerchantApiService } from '../../../core/services/finance-merchant-api.service';
import { FinanceRecurringPatternApiService } from '../../../core/services/finance-recurring-pattern-api.service';
import { FinanceTransactionApiService } from '../../../core/services/finance-transaction-api.service';
import {
  AccountResponse,
  BudgetResponse,
  CategoryResponse,
  MerchantResponse,
  MonthlyTrend,
  RecurringPatternResponse,
  TransactionResponse,
} from '../../../core/models/finance.model';
import { accountLabel, monthlyEquivalent, sourceLabel } from '../finance.util';

interface BudgetRow {
  categoryName: string;
  spend: number;
  cap: number;
  pct: number;
  colorClass: string;
}

interface TransactionRow {
  id: string;
  date: string;
  description: string;
  meta: string;
  metaColorClass: string;
  categoryName: string;
  amount: number;
  isCredit: boolean;
}

interface CategorySpendRow {
  name: string;
  amount: number;
  pct: number;
}

interface TrendBar {
  label: string;
  amount: number;
  heightPct: number;
  current: boolean;
}

interface AttentionItem {
  title: string;
  meta: string;
  arrowClass: string;
  link: string;
}

const UNUSED_IDLE_DAYS = 30;

@Component({
  selector: 'app-finance-dashboard',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, DecimalPipe, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class FinanceDashboard implements OnInit {
  private readonly accountApi = inject(FinanceAccountApiService);
  private readonly categoryApi = inject(FinanceCategoryApiService);
  private readonly analyticsApi = inject(FinanceAnalyticsApiService);
  private readonly budgetApi = inject(FinanceBudgetApiService);
  private readonly transactionApi = inject(FinanceTransactionApiService);
  private readonly recurringApi = inject(FinanceRecurringPatternApiService);
  private readonly merchantApi = inject(FinanceMerchantApiService);

  protected readonly loading = signal(true);
  protected readonly accountLabel = accountLabel;

  protected readonly monthLabel = new Date().toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  protected readonly accounts = signal<AccountResponse[]>([]);
  protected readonly totalBalance = computed(() =>
    this.accounts().reduce((sum, a) => sum + a.currentBalance, 0),
  );

  protected readonly totalIncome = signal<number | null>(null);
  protected readonly totalExpenses = signal<number | null>(null);
  protected readonly fixedMonthlyIncome = signal<number | null>(null);

  // Income is the fixed salary, not the sum of this period's credit
  // transactions - those are just additions (transfers, refunds) layered on
  // top, not "income". Savings/rate follow the same definition, falling
  // back to the computed transaction total only if no salary has been set.
  protected readonly effectiveIncome = computed(() => this.fixedMonthlyIncome() ?? this.totalIncome() ?? 0);
  protected readonly savings = computed(() => this.effectiveIncome() - (this.totalExpenses() ?? 0));
  protected readonly savingsRate = computed(() => {
    const income = this.effectiveIncome();
    return income > 0 ? (this.savings() / income) * 100 : 0;
  });

  protected readonly editingIncome = signal(false);
  protected readonly incomeSaving = signal(false);
  protected incomeDraft = '';

  protected readonly trends = signal<MonthlyTrend[]>([]);
  protected readonly trendBars = computed<TrendBar[]>(() => {
    const trends = this.trends();
    const max = Math.max(...trends.map((t) => t.totalSpend), 1);
    return trends.map((t, i) => ({
      label: t.month,
      amount: t.totalSpend,
      heightPct: Math.max((t.totalSpend / max) * 100, 4),
      current: i === trends.length - 1,
    }));
  });
  protected readonly expenseDelta = computed(() => {
    const trends = this.trends();
    if (trends.length < 2) return null;
    const current = trends[trends.length - 1].totalSpend;
    const previous = trends[trends.length - 2].totalSpend;
    if (previous === 0) return null;
    return { pct: ((current - previous) / previous) * 100, previous };
  });

  protected readonly recentTransactions = signal<TransactionRow[]>([]);
  protected readonly needsReviewCount = signal(0);

  protected readonly budgetRows = signal<BudgetRow[]>([]);
  protected readonly overBudgetRows = computed(() => this.budgetRows().filter((b) => b.pct >= 100));

  protected readonly categorySpend = signal<CategorySpendRow[]>([]);

  protected readonly subscriptionMonthlyTotal = signal(0);
  protected readonly subscriptionActiveCount = signal(0);
  protected readonly subscriptionUnusedCount = signal(0);
  protected readonly subscriptionWastedAmount = signal(0);
  protected readonly subscriptionUnusedNames = signal<string[]>([]);

  protected readonly upcomingRenewals = signal<{ name: string; days: number; amount: number }[]>([]);

  protected readonly attentionItems = computed<AttentionItem[]>(() => {
    const items: AttentionItem[] = [];
    const needsReview = this.needsReviewCount();
    if (needsReview > 0) {
      items.push({
        title: `${needsReview} transaction${needsReview === 1 ? '' : 's'} need a category`,
        meta: 'from imported transactions',
        arrowClass: 'text-warning',
        link: '/finance/transactions',
      });
    }
    for (const b of this.overBudgetRows()) {
      items.push({
        title: `${b.categoryName} budget exceeded`,
        meta: `₹${Math.round(b.spend - b.cap).toLocaleString('en-IN')} over the ₹${b.cap.toLocaleString('en-IN')} cap`,
        arrowClass: 'text-destructive',
        link: '/finance/budgets',
      });
    }
    for (const r of this.upcomingRenewals()) {
      items.push({
        title: `${r.name} renews in ${r.days} day${r.days === 1 ? '' : 's'}`,
        meta: `₹${Math.round(r.amount).toLocaleString('en-IN')}`,
        arrowClass: 'text-primary',
        link: '/finance/subscriptions',
      });
    }
    return items;
  });

  ngOnInit(): void {
    forkJoin({
      accounts: this.accountApi.getAccounts().pipe(catchError(() => of([] as AccountResponse[]))),
      categories: this.categoryApi.getCategories().pipe(catchError(() => of([] as CategoryResponse[]))),
      summary: this.analyticsApi
        .getDashboardSummary()
        .pipe(
          catchError(() =>
            of({ totalIncome: null, totalExpenses: null, savings: 0, fixedMonthlyIncome: null }),
          ),
        ),
      trends: this.analyticsApi.getTrends().pipe(catchError(() => of([] as MonthlyTrend[]))),
      budgets: this.budgetApi.getBudgets().pipe(catchError(() => of([] as BudgetResponse[]))),
      transactionPage: this.transactionApi
        .getTransactions(0, 50)
        .pipe(catchError(() => of({ content: [] as TransactionResponse[] }))),
      patterns: this.recurringApi.getPatterns().pipe(catchError(() => of([] as RecurringPatternResponse[]))),
      merchants: this.merchantApi.getMerchants().pipe(catchError(() => of([] as MerchantResponse[]))),
    })
      .pipe(
        switchMap(({ accounts, categories, summary, trends, budgets, transactionPage, patterns, merchants }) => {
          const categoryMap = new Map(categories.map((c) => [c.id, c]));
          const merchantMap = new Map(merchants.map((m) => [m.id, m]));

          this.accounts.set(accounts);
          this.totalIncome.set(summary.totalIncome);
          this.totalExpenses.set(summary.totalExpenses);
          this.fixedMonthlyIncome.set(summary.fixedMonthlyIncome);
          this.trends.set(trends);

          const txns = transactionPage.content;
          this.needsReviewCount.set(txns.filter((t) => t.categoryId === null && t.type !== 'CREDIT').length);
          this.recentTransactions.set(
            txns.slice(0, 6).map((t) => this.toTransactionRow(t, categoryMap)),
          );

          this.buildSubscriptions(patterns, merchantMap);

          const expenseCategories = categories.filter((c) => c.type === 'EXPENSE');
          const budgetCategoryIds = new Set(budgets.map((b) => b.categoryId));
          const comparisonTargets = [
            ...new Set([...expenseCategories.map((c) => c.id), ...budgetCategoryIds]),
          ];

          const comparisons$ =
            comparisonTargets.length === 0
              ? of([] as { categoryId: string; currentMonthSpend: number }[])
              : forkJoin(
                  comparisonTargets.map((categoryId) =>
                    this.analyticsApi
                      .getCategoryComparison(categoryId)
                      .pipe(catchError(() => of({ categoryId, currentMonthSpend: 0, lastMonthSpend: 0, difference: 0, percentageChange: 0 }))),
                  ),
                );

          return comparisons$.pipe(map((comparisons) => ({ comparisons, categoryMap, budgets })));
        }),
      )
      .subscribe({
        next: ({ comparisons, categoryMap, budgets }) => {
          this.buildCategorySpend(comparisons, categoryMap);
          this.buildBudgetRows(budgets, comparisons, categoryMap);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  private toTransactionRow(
    t: TransactionResponse,
    categoryMap: Map<string, CategoryResponse>,
  ): TransactionRow {
    const isCredit = t.type === 'CREDIT';
    const needsReview = t.categoryId === null && !isCredit;
    return {
      id: t.id,
      date: new Date(t.transactionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      description: t.description,
      meta: needsReview ? 'needs review' : sourceLabel(t.sourceType),
      metaColorClass: needsReview ? 'text-warning' : 'text-foreground/45',
      categoryName: t.categoryId ? (categoryMap.get(t.categoryId)?.name ?? 'Uncategorized') : 'Uncategorized',
      amount: t.amount,
      isCredit,
    };
  }

  private buildSubscriptions(
    patterns: RecurringPatternResponse[],
    merchantMap: Map<string, MerchantResponse>,
  ): void {
    const now = Date.now();
    let monthlyTotal = 0;
    let wasted = 0;
    const unusedNames: string[] = [];
    const renewals: { name: string; days: number; amount: number }[] = [];

    for (const p of patterns) {
      const monthly = monthlyEquivalent(p.averageAmount, p.frequency);
      monthlyTotal += monthly;

      const idleDays = p.lastTransactionDate
        ? Math.floor((now - new Date(p.lastTransactionDate).getTime()) / 86_400_000)
        : null;
      const merchantName = merchantMap.get(p.merchantId)?.name ?? 'Unknown service';

      if (idleDays !== null && idleDays >= UNUSED_IDLE_DAYS) {
        wasted += monthly;
        unusedNames.push(`${merchantName} (${idleDays}d idle)`);
      }

      if (p.nextExpectedDate) {
        const days = Math.ceil((new Date(p.nextExpectedDate).getTime() - now) / 86_400_000);
        if (days >= 0 && days <= 7) {
          renewals.push({ name: merchantName, days, amount: p.averageAmount });
        }
      }
    }

    this.subscriptionMonthlyTotal.set(monthlyTotal);
    this.subscriptionActiveCount.set(patterns.length);
    this.subscriptionUnusedCount.set(unusedNames.length);
    this.subscriptionWastedAmount.set(wasted);
    this.subscriptionUnusedNames.set(unusedNames);
    this.upcomingRenewals.set(renewals.sort((a, b) => a.days - b.days));
  }

  private buildCategorySpend(
    comparisons: { categoryId: string; currentMonthSpend: number }[],
    categoryMap: Map<string, CategoryResponse>,
  ): void {
    const rows = comparisons
      .filter((c) => categoryMap.get(c.categoryId)?.type === 'EXPENSE' && c.currentMonthSpend > 0)
      .map((c) => ({ name: categoryMap.get(c.categoryId)?.name ?? 'Other', amount: c.currentMonthSpend }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
    const max = Math.max(...rows.map((r) => r.amount), 1);
    this.categorySpend.set(rows.map((r) => ({ ...r, pct: (r.amount / max) * 100 })));
  }

  private buildBudgetRows(
    budgets: BudgetResponse[],
    comparisons: { categoryId: string; currentMonthSpend: number }[],
    categoryMap: Map<string, CategoryResponse>,
  ): void {
    const spendByCategory = new Map(comparisons.map((c) => [c.categoryId, c.currentMonthSpend]));
    const rows = budgets.map((b): BudgetRow => {
      const spend = spendByCategory.get(b.categoryId) ?? 0;
      const pct = b.budgetAmount > 0 ? (spend / b.budgetAmount) * 100 : 0;
      const threshold = b.alertThreshold > 0 ? b.alertThreshold : 80;
      const colorClass = pct >= 100 ? 'bg-destructive' : pct >= threshold ? 'bg-warning' : 'bg-primary';
      return {
        categoryName: categoryMap.get(b.categoryId)?.name ?? 'Uncategorized',
        spend,
        cap: b.budgetAmount,
        pct: Math.min(pct, 100),
        colorClass,
      };
    });
    this.budgetRows.set(rows);
  }

  protected startEditIncome(): void {
    this.incomeDraft = this.fixedMonthlyIncome() != null ? String(this.fixedMonthlyIncome()) : '';
    this.editingIncome.set(true);
  }

  protected cancelEditIncome(): void {
    this.editingIncome.set(false);
  }

  protected saveIncome(): void {
    const value = Number(this.incomeDraft);
    if (!Number.isFinite(value) || value < 0) return;

    this.incomeSaving.set(true);
    this.analyticsApi.updateMonthlyIncome(value).subscribe({
      next: (summary) => {
        this.fixedMonthlyIncome.set(summary.fixedMonthlyIncome);
        this.incomeSaving.set(false);
        this.editingIncome.set(false);
      },
      error: () => {
        this.incomeSaving.set(false);
      },
    });
  }
}
