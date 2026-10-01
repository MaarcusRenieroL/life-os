import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Briefcase, Landmark, type LucideIcon } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/error';

import { importApi } from '../finance/import-api';
import type { GmailPurpose } from '../finance/types';

const MAILBOXES: { purpose: GmailPurpose; label: string; hint: string; icon: LucideIcon }[] = [
  { purpose: 'FINANCE', label: 'Bank alerts', hint: 'Debit and credit alerts from your banks.', icon: Landmark },
  { purpose: 'JOBS', label: 'Job emails', hint: 'Application confirmations, interview invites and rejections.', icon: Briefcase },
];

/**
 * Bank mail and job mail often land in different Google accounts, so each purpose connects its own
 * mailbox. The inbox hub reads every connected one; with a single mailbox it serves all purposes.
 */
export function GmailConnections() {
  const queryClient = useQueryClient();
  const { data: status } = useQuery({ queryKey: ['gmail-status'], queryFn: importApi.getGmailStatus });
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function checkJobEmails() {
    setChecking(true);
    setMessage(null);
    try {
      const count = await importApi.syncRecentJobEmails();
      setMessage(`${count} job email(s) queued - applications appear in the job tracker in a moment.`);
      void queryClient.invalidateQueries({ queryKey: ['jobs'] });
    } catch (err) {
      setMessage(getErrorMessage(err, 'Could not check job emails.'));
    } finally {
      setChecking(false);
    }
  }

  return (
    <div>
      <div className="grid gap-3 md:grid-cols-2">
        {MAILBOXES.map(({ purpose, label, hint, icon: Icon }) => {
          const mailbox = status?.mailboxes?.find((m) => m.purpose === purpose);
          return (
            <div key={purpose} className="flex flex-col rounded-md border bg-background/40 p-4">
              <div className="flex items-center gap-2.5">
                <Icon className="size-4 text-muted-foreground" />
                <p className="text-sm font-medium">{label}</p>
                <span
                  className={`ml-auto inline-flex items-center gap-1.5 text-[11px] ${mailbox ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  <span className={`size-1.5 rounded-full ${mailbox ? 'bg-primary shadow-[0_0_6px_var(--primary)]' : 'bg-muted-foreground/50'}`} />
                  {mailbox ? 'Connected' : 'Not connected'}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{hint}</p>

              <div className="mt-3 min-h-10 rounded border border-dashed px-3 py-2">
                {mailbox ? (
                  <>
                    <p className="truncate text-sm font-medium">{mailbox.email ?? 'Mailbox connected'}</p>
                    {mailbox.connectedAt && (
                      <p className="text-[11px] text-muted-foreground">since {new Date(mailbox.connectedAt).toLocaleDateString()}</p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {status?.connected ? 'Reading the other mailbox for this.' : 'Nothing is being read yet.'}
                  </p>
                )}
              </div>

              <Button
                size="sm"
                variant={mailbox ? 'outline' : 'default'}
                className="mt-3 self-start"
                onClick={() => {
                  importApi
                    .getGmailConnectUrl(purpose)
                    .then((url) => window.location.assign(url))
                    .catch((err) => setMessage(getErrorMessage(err, 'Could not start the Gmail connection. Try again.')));
                }}
              >
                {mailbox ? 'Use a different account' : 'Connect Gmail'}
              </Button>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Only mail sent to a connected address is ever seen, so connect the address each kind of mail actually goes to.
      </p>

      {status?.connected && (
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t pt-4">
          <Button size="sm" variant="outline" onClick={() => void checkJobEmails()} disabled={checking}>
            {checking ? 'Checking…' : 'Check job emails now'}
          </Button>
          {message && <span className="text-xs text-muted-foreground">{message}</span>}
        </div>
      )}
    </div>
  );
}
