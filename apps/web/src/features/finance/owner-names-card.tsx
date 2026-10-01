import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { SectionHeading } from '@/components/section-heading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getErrorMessage } from '@/lib/error';

import { analyticsApi } from './analytics-api';

/**
 * Bank narrations carry the account holder's name ("UPI-MAARCUS RENIERO L-..."). A transaction with one of
 * these names is money moving between your own accounts, so it is kept out of spending and income.
 */
export function OwnerNamesCard() {
  const queryClient = useQueryClient();
  const { data: names } = useQuery({ queryKey: ['finance', 'owner-names'], queryFn: analyticsApi.getOwnerNames });
  // null until the user types: the box shows the saved names, then whatever is being edited.
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? (names ?? []).join(', ');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const list = text.split(',').map((n) => n.trim()).filter(Boolean);
      const relabelled = await analyticsApi.setOwnerNames(list);
      setMessage(list.length === 0 ? 'Cleared.' : relabelled > 0 ? `Saved. ${relabelled} existing transaction(s) are now treated as transfers.` : 'Saved. Matching transactions from now on count as transfers.');
      setDraft(null);
      void queryClient.invalidateQueries({ queryKey: ['finance'] });
    } catch (err) {
      setMessage(getErrorMessage(err, 'Could not save your names.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="hud-panel p-5">
      <SectionHeading>Your name on statements</SectionHeading>
      <p className="mt-1 text-xs text-muted-foreground">
        Any transaction whose description contains one of these names is treated as a transfer between your own accounts, not spending or income. List every spelling your bank uses, separated by commas.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Input
          className="min-w-64 flex-1"
          value={text}
          placeholder="e.g. Maarcus Reniero L, Maarcus R"
          onChange={(e) => setDraft(e.target.value)}
          aria-label="Names as they appear on bank statements"
        />
        <Button onClick={() => void save()} disabled={saving}>Save</Button>
      </div>
      {message && <p className="mt-2 text-xs text-muted-foreground">{message}</p>}
    </section>
  );
}
