import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { CategoryComparison, CategoryResponse, MerchantSpend, MonthlyTrend } from '../../../core/models/finance.model';
import { FinanceAnalyticsApiService } from '../../../core/services/finance-analytics-api.service';
import { FinanceCategoryApiService } from '../../../core/services/finance-category-api.service';

interface TrendBar {
  label: string;
  amount: number;
  heightPct: number;
  current: boolean;
}

interface CategoryTrendRow {
  name: string;
  currentSpend: number;
  pctChange: number;
  pct: number;
  colorClass: string;
}

interface MerchantRow {
  rank: number;
  merchant: string;
  totalSpend: number;
}

interface Insight {
  text: string;
  colorClass: string;
}

@Component({
  selector: 'app-finance-analytics',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe, RouterLink],
  templateUrl: './analytics.html',
  styleUrl: './analytics.scss',
})
export class FinanceAnalytics implements OnInit {
  private readonly analyticsApi = inject(FinanceAnalyticsApiService);
  private readonly categoryApi = inject(FinanceCategoryApiService);

  protected readonly loading = signal(true);
  protected readonly trends = signal<MonthlyTrend[]>([]);
  protected readonly topMerchants = signal<MerchantSpend[]>([]);
  protected readonly categoryComparisons = signal<{ category: CategoryResponse; comparison: CategoryComparison }[]>([]);

  protected readonly avgMonthlySpend = computed(() => {
    const trends = this.trends();
    if (trends.length === 0) return 0;
    return trends.reduce((sum, t) => sum + t.totalSpend, 0) / trends.length;
  });

  protected readonly highestMonth = computed(() => this.extremeMonth((a, b) => b.totalSpend - a.totalSpend));
  protected readonly lowestMonth = computed(() => this.extremeMonth((a, b) => a.totalSpend - b.totalSpend));

  private extremeMonth(compare: (a: MonthlyTrend, b: MonthlyTrend) => number): MonthlyTrend | null {
    const trends = this.trends();
    if (trends.length === 0) return null;
    return [...trends].sort(compare)[0];
  }

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

  protected readonly categoryTrendRows = computed<CategoryTrendRow[]>(() => {
    const rows = this.categoryComparisons()
      .filter((c) => c.comparison.currentMonthSpend > 0)
      .map((c): CategoryTrendRow => {
        const pctChange = c.comparison.percentageChange;
        return {
          name: c.category.name,
          currentSpend: c.comparison.currentMonthSpend,
          pctChange,
          pct: 0,
          colorClass: pctChange > 15 ? 'text-destructive' : pctChange > 0 ? 'text-warning' : 'text-primary',
        };
      })
      .sort((a, b) => b.currentSpend - a.currentSpend);
    const max = Math.max(...rows.map((r) => r.currentSpend), 1);
    return rows.map((r) => ({ ...r, pct: (r.currentSpend / max) * 100 }));
  });

  protected readonly merchantRows = computed<MerchantRow[]>(() =>
    this.topMerchants().map((m, i) => ({ rank: i + 1, merchant: m.merchant, totalSpend: m.totalSpend })),
  );

  protected readonly insights = computed<Insight[]>(() => {
    const items: Insight[] = [];
    const rows = this.categoryTrendRows();

    const biggestIncrease = [...rows].sort((a, b) => b.pctChange - a.pctChange)[0];
    if (biggestIncrease && biggestIncrease.pctChange > 0) {
      items.push({
        text: `${biggestIncrease.name} is up ${biggestIncrease.pctChange.toFixed(0)}% vs last month, now ₹${biggestIncrease.currentSpend.toLocaleString('en-IN')}.`,
        colorClass: 'bg-destructive',
      });
    }

    const biggestDecrease = [...rows].sort((a, b) => a.pctChange - b.pctChange)[0];
    if (biggestDecrease && biggestDecrease.pctChange < 0) {
      items.push({
        text: `${biggestDecrease.name} dropped ${Math.abs(biggestDecrease.pctChange).toFixed(0)}% vs last month.`,
        colorClass: 'bg-primary',
      });
    }

    const highest = this.highestMonth();
    const avg = this.avgMonthlySpend();
    if (highest && avg > 0 && highest.totalSpend > avg) {
      items.push({
        text: `${highest.month} was your highest month at ₹${highest.totalSpend.toLocaleString('en-IN')}, ${(((highest.totalSpend - avg) / avg) * 100).toFixed(0)}% above your average.`,
        colorClass: 'bg-warning',
      });
    }

    const topMerchant = this.merchantRows()[0];
    if (topMerchant) {
      items.push({
        text: `${topMerchant.merchant} is your top merchant at ₹${topMerchant.totalSpend.toLocaleString('en-IN')} over this window.`,
        colorClass: 'bg-foreground/40',
      });
    }

    return items;
  });

  ngOnInit(): void {
    forkJoin({
      trends: this.analyticsApi.getTrends().pipe(catchError(() => of([] as MonthlyTrend[]))),
      merchants: this.analyticsApi.getTopMerchants(8).pipe(catchError(() => of([] as MerchantSpend[]))),
      categories: this.categoryApi.getCategories().pipe(catchError(() => of([] as CategoryResponse[]))),
    }).subscribe(({ trends, merchants, categories }) => {
      this.trends.set(trends);
      this.topMerchants.set(merchants);

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
        this.categoryComparisons.set(
          expenseCategories.map((category, i) => ({ category, comparison: comparisons[i] })),
        );
        this.loading.set(false);
      });
    });
  }
}
