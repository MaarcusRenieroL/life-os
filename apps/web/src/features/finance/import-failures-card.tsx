import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { SectionHeading } from '@/components/section-heading';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/error';

import { importFailureApi } from './import-failure-api';
import { formatINR } from './utils';

const REASON_TEXT: Record<string, string> = {
  NO_ACCOUNT: 'No matching account yet',
  UNPARSED: "Couldn't read this alert",
  ERROR: 'Could not be saved',
};

/**
 * Bank alerts that did not make it into your books: the amount is known but there was no account to
 * put it in, or the email format wasn't understood. They used to vanish silently; here they wait
 * for you. Creating the missing account books the waiting ones automatically.
 */
export function ImportFailuresCard() {
  const queryClient = useQueryClient();
  const { data: failures = [] } = useQuery({ queryKey: ['finance', 'import-failures'], queryFn: importFailureApi.list });
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ id: string; text: string } | null>(null);

  async function act(id: string, action: () => Promise<void>) {
    setBusy(id);
    setMessage(null);
    try {
      await action();
      void queryClient.invalidateQueries({ queryKey: ['finance'] });
    } catch (err) {
      setMessage({ id, text: getErrorMessage(err, 'That did not work.') });
    } finally {
      setBusy(null);
    }
  }

  if (failures.length === 0) return null;

  return (
    <section className="hud-panel border-yellow-500/40 p-5">
      <SectionHeading>Missing from your books · {failures.length} bank alert{failures.length === 1 ? "" : "s"}</SectionHeading>
      <p className="mt-1 text-xs text-muted-foreground">
        These arrived by email but could not be added. If an account is missing, <Link to="/finance/accounts" className="text-primary hover:underline">create it</Link> and they are booked automatically.
      </p>
      <ul className="mt-3 flex flex-col divide-y">
        {failures.map((f) => (
          <li key={f.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
            <div className="min-w-0 flex-1">
              {f.amount != null ? (
                <p className="text-sm font-medium">
                  {f.type === 'CREDIT' ? '+' : '-'}
                  {formatINR(f.amount)} · {f.description}
                </p>
              ) : (
                <p className="truncate text-sm font-medium">{f.subject ?? 'Bank email'}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {REASON_TEXT[f.reason] ?? f.reason}
                {f.bankName ? ` · ${f.bankName} ${f.accountType?.toLowerCase().replace('_', ' ')}` : ''}
                {f.transactionDate ? ` · ${f.transactionDate.slice(0, 10)}` : ''}
              </p>
              {f.amount == null && f.snippet && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{f.snippet}</p>}
              {message?.id === f.id && <p className="mt-1 text-xs text-destructive">{message.text}</p>}
            </div>
            <div className="flex shrink-0 gap-2">
              {f.amount != null && (
                <Button size="sm" variant="outline" disabled={busy === f.id} onClick={() => void act(f.id, () => importFailureApi.retry(f.id))}>
                  Try again
                </Button>
              )}
              <Button size="sm" variant="ghost" disabled={busy === f.id} onClick={() => void act(f.id, () => importFailureApi.dismiss(f.id))}>
                Dismiss
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
