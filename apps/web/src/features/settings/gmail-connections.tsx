import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/error';

import { importApi } from '../finance/import-api';
import type { GmailPurpose } from '../finance/types';

const MAILBOXES: { purpose: GmailPurpose; label: string; hint: string }[] = [
  { purpose: 'FINANCE', label: 'Bank alerts', hint: 'Debit and credit alerts from your banks' },
  { purpose: 'JOBS', label: 'Job emails', hint: 'Application confirmations, interview invites, rejections' },
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
      <p className="mb-3 text-xs text-muted-foreground">
        Only mail sent to a connected address is ever seen, so connect the address each kind of mail actually goes to.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {MAILBOXES.map(({ purpose, label, hint }) => {
          const mailbox = status?.mailboxes?.find((m) => m.purpose === purpose);
          return (
            <div key={purpose} className="rounded-md border p-3 text-sm">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
              {mailbox ? (
                <>
                  <p className="mt-1 break-all font-medium">{mailbox.email ?? 'Connected'}</p>
                  {mailbox.connectedAt && (
                    <p className="text-xs text-muted-foreground">since {new Date(mailbox.connectedAt).toLocaleDateString()}</p>
                  )}
                </>
              ) : (
                <p className="mt-1 text-muted-foreground">
                  {status?.connected ? 'Not connected - using the other mailbox' : 'Not connected'}
                </p>
              )}
              <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
              <a href={importApi.gmailConnectUrl(purpose)} className="mt-2 inline-block text-xs text-primary hover:underline">
                {mailbox ? 'Reconnect with another account' : 'Connect'}
              </a>
            </div>
          );
        })}
      </div>
      {status?.connected && (
        <div className="mt-3 flex items-center gap-3">
          <Button size="sm" variant="outline" onClick={() => void checkJobEmails()} disabled={checking}>
            {checking ? 'Checking…' : 'Check job emails now'}
          </Button>
          {message && <span className="text-xs text-muted-foreground">{message}</span>}
        </div>
      )}
    </div>
  );
}
