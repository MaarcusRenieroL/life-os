import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { SectionHeading } from '@/components/section-heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import { accountApi } from './account-api';
import { categoryApi } from './category-api';
import { transactionApi } from './transaction-api';
import { formatINR, sourceLabel } from './utils';

function initials(description: string): string {
  return description.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

export function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: tx } = useQuery({ queryKey: ['finance', 'transaction', id], queryFn: () => transactionApi.getTransaction(id!), enabled: !!id });
  const { data: categories = [] } = useQuery({ queryKey: ['finance', 'categories'], queryFn: categoryApi.getCategories, staleTime: 5 * 60_000 });
  const { data: accounts = [] } = useQuery({ queryKey: ['finance', 'accounts'], queryFn: accountApi.getAccounts, staleTime: 5 * 60_000 });
  const { data: recentPage } = useQuery({
    queryKey: ['finance', 'transactions', 'recent-for-detail'],
    queryFn: () => transactionApi.getTransactions(0, 50),
  });

  const [notes, setNotes] = useState(tx?.notes ?? '');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(tx?.categoryIds ?? []);
  const [renaming, setRenaming] = useState(false);
  const [correctedName, setCorrectedName] = useState(tx?.description ?? '');
  const [saving, setSaving] = useState(false);

  const recent = recentPage?.content ?? [];
  const index = recent.findIndex((t) => t.id === id);
  const prev = index > 0 ? recent[index - 1] : null;
  const next = index >= 0 && index < recent.length - 1 ? recent[index + 1] : null;

  const similar = useMemo(() => {
    if (!tx) return [];
    const firstWord = tx.description.split(/\s+/)[0]?.toLowerCase();
    if (!firstWord) return [];
    return recent.filter((t) => t.id !== tx.id && t.description.toLowerCase().includes(firstWord)).slice(0, 5);
  }, [tx, recent]);

  if (!tx) {
    return <Link to="/finance/transactions" className="text-sm text-muted-foreground hover:underline">← Transactions</Link>;
  }

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['finance'] });
  }

  async function saveRename() {
    if (!id || !correctedName.trim()) return;
    await transactionApi.rename(id, correctedName.trim());
    setRenaming(false);
    invalidate();
  }

  async function save() {
    if (!id || saving) return;
    setSaving(true);
    try {
      await Promise.all([
        transactionApi.updateTransaction(id, { notes }),
        transactionApi.updateCategories(id, { categoryIds: selectedCategories }),
      ]);
      invalidate();
    } finally {
      setSaving(false);
    }
  }

  function toggleCategory(catId: string) {
    setSelectedCategories((s) => (s.includes(catId) ? s.filter((c) => c !== catId) : [...s, catId]));
  }

  const account = accounts.find((a) => a.id === tx.accountId);

  return (
    <div>
      <div className="flex items-center justify-between">
        <Link to="/finance/transactions" className="text-sm text-muted-foreground hover:underline">← Transactions</Link>
        <div className="flex gap-2 text-xs">
          {prev && <button className="hover:underline" onClick={() => navigate(`/finance/transactions/${prev.id}`)}>← Prev</button>}
          {next && <button className="hover:underline" onClick={() => navigate(`/finance/transactions/${next.id}`)}>Next →</button>}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-muted text-sm font-semibold">
          {initials(tx.description)}
        </div>
        <div className="flex-1">
          {renaming ? (
            <div className="flex gap-2">
              <Input value={correctedName} onChange={(e) => setCorrectedName(e.target.value)} className="h-8" />
              <Button size="sm" onClick={() => void saveRename()}>Save</Button>
            </div>
          ) : (
            <h1 className="text-xl font-semibold">{tx.description}</h1>
          )}
          <p className="text-sm text-muted-foreground">{account?.accountName ?? tx.accountId} · {sourceLabel(tx.sourceType)}</p>
        </div>
        <div className={`text-xl font-semibold ${tx.type === 'CREDIT' ? 'text-primary' : ''}`}>
          {tx.type === 'CREDIT' ? '+' : '-'}{formatINR(tx.amount)}
        </div>
      </div>

      {!renaming && (
        <button className="mt-1 text-xs text-primary hover:underline" onClick={() => { setRenaming(true); setCorrectedName(tx.description); }}>
          Correct this name
        </button>
      )}
      <p className="mt-1 text-[11px] text-muted-foreground">
        Renaming teaches the categorization engine and retroactively renames every other past transaction with the same raw description.
      </p>

      <section className="mt-6">
        <SectionHeading>Categories</SectionHeading>
        {tx.categoryManuallySet && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            Manually categorized - saving here also teaches a rule for similar future transactions.
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          {categories.map((c) => (
            <button key={c.id} onClick={() => toggleCategory(c.id)}>
              <Badge variant={selectedCategories.includes(c.id) ? 'default' : 'outline'}>{c.name}</Badge>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-4">
        <SectionHeading>Notes</SectionHeading>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-2" />
      </section>

      <Button className="mt-4" onClick={() => void save()} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>

      <section className="mt-6 rounded-lg border bg-card p-4">
        <SectionHeading>Details</SectionHeading>
        <dl className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <dt>Status</dt><dd className="text-foreground">{tx.status}</dd>
          <dt>Recurring</dt><dd className="text-foreground">{tx.isRecurring ? 'Yes' : 'No'}</dd>
          <dt>Duplicate</dt><dd className="text-foreground">{tx.isDuplicate ? 'Yes' : 'No'}</dd>
          {tx.disputeReason && (<><dt>Dispute reason</dt><dd className="text-foreground">{tx.disputeReason}</dd></>)}
        </dl>
      </section>

      <section className="mt-4 rounded-lg border bg-card p-4">
        <SectionHeading>History</SectionHeading>
        <dl className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          {tx.importedAt && (<><dt>Imported</dt><dd className="text-foreground">{new Date(tx.importedAt).toLocaleString()}</dd></>)}
          <dt>Created</dt><dd className="text-foreground">{new Date(tx.createdAt).toLocaleString()}</dd>
          {tx.updatedAt !== tx.createdAt && (<><dt>Updated</dt><dd className="text-foreground">{new Date(tx.updatedAt).toLocaleString()}</dd></>)}
          {tx.disputeDate && (<><dt>Disputed</dt><dd className="text-foreground">{new Date(tx.disputeDate).toLocaleString()}</dd></>)}
        </dl>
      </section>

      {similar.length > 0 && (
        <section className="mt-4">
          <SectionHeading>Similar transactions</SectionHeading>
          <ul className="mt-2 flex flex-col gap-1">
            {similar.map((t) => (
              <li key={t.id}>
                <Link to={`/finance/transactions/${t.id}`} className="text-sm hover:underline">{t.description} · {formatINR(t.amount)}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-4">
        <Link to={`/finance/rules?matchValue=${encodeURIComponent(tx.description)}`} className="text-xs text-primary hover:underline">
          Create rule from this
        </Link>
      </div>
    </div>
  );
}
