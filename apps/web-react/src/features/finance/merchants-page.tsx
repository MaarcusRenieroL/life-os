import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { Input } from '@/components/ui/input';

import { categoryApi } from './category-api';
import { MerchantDialog } from './merchant-dialog';
import { merchantApi } from './merchant-api';
import type { MerchantResponse } from './types';
import { formatINR } from './utils';

export function MerchantsPage() {
  const queryClient = useQueryClient();
  const { data: merchants = [] } = useQuery({ queryKey: ['finance', 'merchants'], queryFn: merchantApi.getMerchants });
  const { data: categories = [] } = useQuery({ queryKey: ['finance', 'categories'], queryFn: categoryApi.getCategories });

  const [query, setQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MerchantResponse | null>(null);

  const filtered = useMemo(
    () =>
      merchants
        .filter((m) => m.name.toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [merchants, query],
  );

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['finance', 'merchants'] });
  }

  async function remove(merchant: MerchantResponse) {
    if (!confirm(`Delete "${merchant.name}"?`)) return;
    await merchantApi.deleteMerchant(merchant.id);
    invalidate();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Merchants</h1>
      <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search merchants…" className="mt-4 max-w-xs" />

      <div className="mt-4 overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Merchant</th>
              <th className="px-3 py-2">Default category</th>
              <th className="px-3 py-2">Avg spend</th>
              <th className="px-3 py-2">Txns</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id} className="border-b last:border-b-0">
                <td className="px-3 py-2">
                  {m.name}
                  {!m.isRecognized && <div className="text-[10px] text-muted-foreground">manually added</div>}
                </td>
                <td className="px-3 py-2">{categories.find((c) => c.id === m.categoryId)?.name ?? '—'}</td>
                <td className="px-3 py-2">{m.averageTransactionAmount ? formatINR(m.averageTransactionAmount) : '—'}</td>
                <td className="px-3 py-2">{m.transactionCount}</td>
                <td className="px-3 py-2 text-xs">
                  <button className="text-primary hover:underline" onClick={() => { setEditing(m); setDialogOpen(true); }}>Edit</button>
                  <button className="ml-2 text-destructive hover:underline" onClick={() => void remove(m)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-4 text-sm text-muted-foreground">No merchants found.</p>}
      </div>

      <MerchantDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} onSaved={invalidate} />
    </div>
  );
}
