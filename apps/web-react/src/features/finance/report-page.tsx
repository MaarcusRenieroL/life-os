import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { analyticsApi } from './analytics-api';
import { budgetApi } from './budget-api';
import { categoryApi } from './category-api';
import { downloadBlob, reportApi } from './report-api';
import { formatINR } from './utils';

const SEGMENT_COLORS = ['bg-primary', 'bg-primary/70', 'bg-yellow-500', 'bg-destructive', 'bg-primary/40', 'bg-foreground/30'];

function defaultTaxYear(): number {
  const now = new Date();
  // Indian financial year runs Apr 1 - Mar 31, so before April this year's FY
  // started last calendar year.
  return now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear();
}

export function ReportPage() {
  const { data: categories = [] } = useQuery({ queryKey: ['finance', 'categories'], queryFn: categoryApi.getCategories });
  const { data: budgets = [] } = useQuery({ queryKey: ['finance', 'budgets'], queryFn: budgetApi.getBudgets });
  const expenseCategoryIds = categories.filter((c) => c.type === 'EXPENSE').map((c) => c.id);
  const { data: comparisons = [] } = useQuery({
    queryKey: ['finance', 'comparisons', expenseCategoryIds],
    queryFn: () => Promise.all(expenseCategoryIds.map((id) => analyticsApi.getCategoryComparison(id))),
    enabled: expenseCategoryIds.length > 0,
  });

  const [taxYear, setTaxYear] = useState(defaultTaxYear());
  const [exporting, setExporting] = useState(false);

  const totalSpend = comparisons.reduce((s, c) => s + c.currentMonthSpend, 0);
  const expenseSegments = useMemo(
    () =>
      [...comparisons]
        .sort((a, b) => b.currentMonthSpend - a.currentMonthSpend)
        .map((c, i) => ({
          name: categories.find((cat) => cat.id === c.categoryId)?.name ?? 'Unknown',
          pct: totalSpend > 0 ? (c.currentMonthSpend / totalSpend) * 100 : 0,
          color: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
        })),
    [comparisons, categories, totalSpend],
  );

  const budgetPerformance = budgets.map((b) => {
    const spend = comparisons.find((c) => c.categoryId === b.categoryId)?.currentMonthSpend ?? 0;
    const pct = b.budgetAmount > 0 ? (spend / b.budgetAmount) * 100 : 0;
    return {
      name: categories.find((c) => c.id === b.categoryId)?.name ?? 'Unknown',
      text: pct > 100 ? `${(pct - 100).toFixed(0)}% over` : `${pct.toFixed(0)}% used`,
    };
  });

  const monthOverMonth = [...comparisons]
    .sort((a, b) => b.currentMonthSpend - a.currentMonthSpend)
    .slice(0, 8)
    .map((c) => ({ ...c, name: categories.find((cat) => cat.id === c.categoryId)?.name ?? 'Unknown' }));

  async function exportPdf() {
    setExporting(true);
    try {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
      const blob = await reportApi.getCustomReport(start, end);
      downloadBlob(blob, 'custom-report.pdf');
    } finally {
      setExporting(false);
    }
  }

  async function exportTaxCsv() {
    setExporting(true);
    try {
      const blob = await reportApi.getTaxReport(taxYear);
      downloadBlob(blob, `tax-report-fy${taxYear}-${taxYear + 1}.csv`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Report</h1>

      <section className="mt-4 rounded-lg border bg-card p-5">
        <h2 className="text-sm font-semibold">Monthly report</h2>
        <p className="mt-1 text-xs text-muted-foreground">Full breakdown for the current calendar month, as a PDF.</p>
        <Button size="sm" variant="outline" className="mt-3" onClick={() => void exportPdf()} disabled={exporting}>
          Export PDF
        </Button>
      </section>

      <section className="mt-4 rounded-lg border bg-card p-5">
        <h2 className="text-sm font-semibold">Tax report</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Full financial-year transaction CSV (1 Apr {taxYear} – 31 Mar {taxYear + 1}) for ITR filing.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <Input type="number" value={taxYear} onChange={(e) => setTaxYear(Number(e.target.value))} className="w-28" />
          <Button size="sm" variant="outline" onClick={() => void exportTaxCsv()} disabled={exporting}>
            Export tax CSV
          </Button>
        </div>
      </section>

      <section className="mt-4 rounded-lg border bg-card p-5">
        <h2 className="text-sm font-semibold">Expense breakdown</h2>
        {expenseSegments.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No categorized spend yet.</p>
        ) : (
          <>
            <div className="mt-3 flex h-6 overflow-hidden rounded-full">
              {expenseSegments.map((s) => (
                <div key={s.name} className={s.color} style={{ width: `${s.pct}%` }} title={s.name} />
              ))}
            </div>
            <ul className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
              {expenseSegments.map((s) => (
                <li key={s.name} className="flex items-center gap-1.5">
                  <span className={`size-2 rounded-full ${s.color}`} /> {s.name} ({s.pct.toFixed(0)}%)
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="mt-4 rounded-lg border bg-card p-5">
        <h2 className="text-sm font-semibold">Budget performance</h2>
        <ul className="mt-2 flex flex-col gap-1.5 text-sm">
          {budgetPerformance.map((b) => (
            <li key={b.name} className="flex justify-between"><span>{b.name}</span><span>{b.text}</span></li>
          ))}
          {budgetPerformance.length === 0 && <p className="text-sm text-muted-foreground">No budgets set up yet.</p>}
        </ul>
      </section>

      <section className="mt-4 rounded-lg border bg-card p-5">
        <h2 className="text-sm font-semibold">Month over month</h2>
        <table className="mt-2 w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr><th>Category</th><th>This month</th><th>Last month</th></tr>
          </thead>
          <tbody>
            {monthOverMonth.map((c) => (
              <tr key={c.categoryId}>
                <td className="py-1">{c.name}</td>
                <td>{formatINR(c.currentMonthSpend)}</td>
                <td>{formatINR(c.lastMonthSpend)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {monthOverMonth.length === 0 && <p className="mt-2 text-sm text-muted-foreground">Not enough history yet.</p>}
      </section>
    </div>
  );
}
