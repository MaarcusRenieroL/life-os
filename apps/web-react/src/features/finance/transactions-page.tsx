import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDebouncedCallback } from '@/lib/use-debounced-callback';

import { AddTransactionDialog } from './add-transaction-dialog';
import { categoryApi } from './category-api';
import { CategorizeDialog } from './categorize-dialog';
import { DisputeDialog } from './dispute-dialog';
import { transactionApi } from './transaction-api';
import type { TransactionFilters, TransactionResponse } from './types';
import { formatINR } from './utils';

const PAGE_SIZE = 50;

type StatusChip = 'ALL' | 'NEEDS_REVIEW' | 'CATEGORIZED' | 'DUPLICATE';

export function TransactionsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [page, setPage] = useState(0);
  const [statusChip, setStatusChip] = useState<StatusChip>('ALL');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<TransactionResponse | null>(null);
  const [categorizeOpen, setCategorizeOpen] = useState(false);
  const [categorizeTargets, setCategorizeTargets] = useState<string[]>([]);
  const [disputeOpen, setDisputeOpen] = useState(false);

  const debouncedSearch = useDebouncedCallback((value: string) => {
    setSearch(value);
    setPage(0);
  }, 350);

  const filters: TransactionFilters = {
    search: search || undefined,
    status: statusChip === 'ALL' ? undefined : statusChip,
    categoryId: categoryId ?? undefined,
  };

  const { data: categories = [] } = useQuery({ queryKey: ['finance', 'categories'], queryFn: categoryApi.getCategories });
  const { data: txPage, isLoading } = useQuery({
    queryKey: ['finance', 'transactions', page, filters],
    queryFn: () => transactionApi.getTransactions(page, PAGE_SIZE, filters),
  });

  const transactions = txPage?.content ?? [];

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['finance', 'transactions'] });
  }

  function categoryNames(t: TransactionResponse): string {
    if (t.categoryIds.length > 0) {
      return t.categoryIds.map((id) => categories.find((c) => c.id === id)?.name ?? id).join(', ');
    }
    if (t.categoryId) return categories.find((c) => c.id === t.categoryId)?.name ?? t.categoryId;
    return 'Uncategorized';
  }

  function needsReview(t: TransactionResponse): boolean {
    return t.categoryId === null && t.type !== 'CREDIT';
  }

  function toggleSelect(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function rowClick(t: TransactionResponse) {
    if (needsReview(t)) {
      setCategorizeTargets([t.id]);
      setCategorizeOpen(true);
    } else {
      navigate(`/finance/transactions/${t.id}`);
    }
  }

  async function saveCategories(categoryIds: string[]) {
    for (const id of categorizeTargets) {
      await transactionApi.updateCategories(id, { categoryIds });
    }
    invalidate();
    setSelected(new Set());
  }

  async function markDuplicate() {
    const ids = Array.from(selected);
    if (ids.length < 2) return;
    await transactionApi.merge(ids[0], { duplicateTransactionIds: ids.slice(1) });
    invalidate();
    setSelected(new Set());
  }

  async function disputeSelected(reason: string) {
    for (const id of selected) {
      await transactionApi.dispute(id, { reason });
    }
    invalidate();
    setSelected(new Set());
  }

  async function deleteSelected() {
    if (!confirm(`Delete ${selected.size} transaction(s)?`)) return;
    for (const id of selected) {
      await transactionApi.deleteTransaction(id);
    }
    invalidate();
    setSelected(new Set());
  }

  function exportCsv() {
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const rows = transactions.map((t) =>
      [
        t.transactionDate.slice(0, 10),
        escape(t.description),
        escape(categoryNames(t)),
        t.accountId,
        t.sourceType,
        t.type === 'CREDIT' ? t.amount : -t.amount,
      ].join(','),
    );
    const csv = ['Date,Description,Category,Account,Source,Amount', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'transactions.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  const netTotal = useMemo(
    () => transactions.reduce((sum, t) => sum + (t.type === 'CREDIT' ? t.amount : -t.amount), 0),
    [transactions],
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}>Export CSV</Button>
          <Button size="sm" onClick={() => { setEditingTx(null); setAddOpen(true); }}>+ Add transaction</Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Input
          value={searchInput}
          onChange={(e) => { setSearchInput(e.target.value); debouncedSearch(e.target.value); }}
          placeholder="Search…"
          className="max-w-xs"
        />
        {(['ALL', 'NEEDS_REVIEW', 'CATEGORIZED', 'DUPLICATE'] as StatusChip[]).map((chip) => (
          <Button
            key={chip}
            size="sm"
            variant={statusChip === chip ? 'secondary' : 'ghost'}
            onClick={() => { setStatusChip(chip); setPage(0); }}
          >
            {chip === 'ALL' ? 'All' : chip === 'NEEDS_REVIEW' ? 'Needs review' : chip === 'CATEGORIZED' ? 'Categorized' : 'Duplicates'}
          </Button>
        ))}
        <Select value={categoryId ?? '__all__'} onValueChange={(v) => { setCategoryId(v === '__all__' ? null : v); setPage(0); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selected.size > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs">
          <span>{selected.size} selected</span>
          {selected.size === 1 && (
            <button className="hover:underline" onClick={() => { setEditingTx(transactions.find((t) => selected.has(t.id))!); setAddOpen(true); }}>
              Edit
            </button>
          )}
          <button className="hover:underline" onClick={() => { setCategorizeTargets(Array.from(selected)); setCategorizeOpen(true); }}>
            Set categories
          </button>
          {selected.size >= 2 && <button className="hover:underline" onClick={() => void markDuplicate()}>Mark as duplicate</button>}
          <button className="hover:underline" onClick={() => setDisputeOpen(true)}>Dispute</button>
          <button className="text-destructive hover:underline" onClick={() => void deleteSelected()}>Delete</button>
          <button className="ml-auto hover:underline" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}

      <div className="mt-3 overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-2 py-2"></th>
              <th className="px-2 py-2">Date</th>
              <th className="px-2 py-2">Description</th>
              <th className="px-2 py-2">Category</th>
              <th className="px-2 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr
                key={t.id}
                className={`cursor-pointer border-b last:border-b-0 hover:bg-muted/30 ${needsReview(t) ? 'bg-yellow-500/5' : ''}`}
              >
                <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggleSelect(t.id)} />
                </td>
                <td className="px-2 py-2" onClick={() => rowClick(t)}>{t.transactionDate.slice(0, 10)}</td>
                <td className="px-2 py-2" onClick={() => rowClick(t)}>{t.description}</td>
                <td className="px-2 py-2" onClick={() => rowClick(t)}>{categoryNames(t)}</td>
                <td className={`px-2 py-2 text-right ${t.type === 'CREDIT' ? 'text-primary' : ''}`} onClick={() => rowClick(t)}>
                  {t.type === 'CREDIT' ? '+' : '-'}{formatINR(t.amount)}
                </td>
              </tr>
            ))}
          </tbody>
          {transactions.length > 0 && (
            <tfoot>
              <tr className="border-t text-sm font-medium">
                <td colSpan={4} className="px-2 py-2 text-right">Net</td>
                <td className="px-2 py-2 text-right">{formatINR(netTotal)}</td>
              </tr>
            </tfoot>
          )}
        </table>
        {isLoading && <p className="p-4 text-sm text-muted-foreground">Loading transactions…</p>}
        {!isLoading && transactions.length === 0 && <p className="p-4 text-sm text-muted-foreground">No transactions found.</p>}
      </div>

      {txPage && txPage.totalPages > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={txPage.first} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-xs text-muted-foreground">Page {txPage.number + 1} of {txPage.totalPages}</span>
          <Button variant="outline" size="sm" disabled={txPage.last} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}

      <AddTransactionDialog open={addOpen} onOpenChange={setAddOpen} editing={editingTx} onSaved={invalidate} />
      <CategorizeDialog
        open={categorizeOpen}
        onOpenChange={setCategorizeOpen}
        transactionLabel={categorizeTargets.length === 1 ? transactions.find((t) => t.id === categorizeTargets[0])?.description ?? '' : `${categorizeTargets.length} selected transactions`}
        onSave={(ids) => void saveCategories(ids)}
      />
      <DisputeDialog open={disputeOpen} onOpenChange={setDisputeOpen} count={selected.size} onSubmit={(reason) => void disputeSelected(reason)} />
    </div>
  );
}
