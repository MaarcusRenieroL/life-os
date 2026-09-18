import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { SectionHeading } from '@/components/section-heading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { accountApi } from './account-api';
import { importApi } from './import-api';

export function ImportPage() {
  const queryClient = useQueryClient();
  const { data: accounts = [] } = useQuery({ queryKey: ['finance', 'accounts'], queryFn: accountApi.getAccounts });
  const { data: gmailStatus } = useQuery({ queryKey: ['finance', 'gmail-status'], queryFn: importApi.getGmailStatus });

  const [accountId, setAccountId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [state, setState] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<{ rowsImported: number; rowsParsed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const isPdf = file?.name.toLowerCase().endsWith('.pdf') ?? false;

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }

  async function parseStatement() {
    if (!file || !accountId) return;
    setState('uploading');
    setError(null);
    try {
      const res = await importApi.importStatement(file, accountId, isPdf ? password || undefined : undefined);
      setResult(res);
      setState('success');
      queryClient.invalidateQueries({ queryKey: ['finance'] });
    } catch (err) {
      setState('error');
      setError(
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
          'Could not parse this statement. Please try again.',
      );
    }
  }

  async function syncGmail() {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const count = await importApi.syncAllGmailHistory();
      setSyncMessage(`Synced ${count} transaction(s).`);
      queryClient.invalidateQueries({ queryKey: ['finance'] });
    } catch (err) {
      setSyncMessage(
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Sync failed.',
      );
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Import</h1>

      <section className="mt-4 rounded-lg border bg-card p-5">
        <SectionHeading>Upload a statement</SectionHeading>
        {accounts.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Add an account first — statements need to be linked to one.</p>
        ) : (
          <>
            <div className="mt-3">
              <Select value={accountId} onValueChange={(v) => setAccountId(v ?? '')}>
                <SelectTrigger><SelectValue placeholder="Choose account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.accountName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={`mt-3 flex h-28 items-center justify-center rounded-lg border-2 border-dashed text-sm text-muted-foreground ${dragOver ? 'border-primary bg-primary/5' : ''}`}
            >
              {file ? file.name : 'Drag & drop a CSV or PDF, or click to browse'}
              <input
                type="file"
                accept=".csv,.pdf"
                className="absolute h-28 w-full max-w-md cursor-pointer opacity-0"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>

            {isPdf && (
              <div className="mt-3">
                <Input type="password" placeholder="PDF password (optional)" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            )}

            <Button className="mt-3" onClick={() => void parseStatement()} disabled={!file || !accountId || state === 'uploading'}>
              {state === 'uploading' ? 'Parsing…' : 'Parse statement'}
            </Button>

            {state === 'success' && result && (
              <p className="mt-2 text-sm text-primary">{result.rowsImported} of {result.rowsParsed} transactions imported.</p>
            )}
            {state === 'error' && error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          </>
        )}

        <div className="mt-4 border-t pt-3 text-xs text-muted-foreground">
          <p>1. Upload a CSV or PDF statement for the linked account (PDF password optional).</p>
          <p>2. It's parsed immediately and categorized using your rules.</p>
          <p>3. New and duplicate transactions land in the ledger for review.</p>
        </div>
      </section>

      <section className="mt-4 rounded-lg border bg-card p-5">
        <SectionHeading>Gmail sync</SectionHeading>
        {gmailStatus?.connected ? (
          <div className="mt-2 text-sm">
            <p className="text-primary">Connected {gmailStatus.connectedAt ? `since ${new Date(gmailStatus.connectedAt).toLocaleDateString()}` : ''}</p>
            {gmailStatus.lastRefreshedAt && (
              <p className="text-xs text-muted-foreground">Token last refreshed {new Date(gmailStatus.lastRefreshedAt).toLocaleDateString()}</p>
            )}
            <div className="mt-3 flex items-center gap-3">
              <Button size="sm" variant="outline" onClick={() => void syncGmail()} disabled={syncing}>
                {syncing ? 'Syncing…' : 'Sync all history'}
              </Button>
              <a href={importApi.gmailConnectUrl()} className="text-xs text-primary hover:underline">Reconnect</a>
            </div>
            {syncMessage && <p className="mt-2 text-xs text-muted-foreground">{syncMessage}</p>}
          </div>
        ) : (
          <div className="mt-2">
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">not connected</span>
            <div className="mt-2">
              <a href={importApi.gmailConnectUrl()} className="text-sm text-primary hover:underline">Connect Gmail</a>
            </div>
          </div>
        )}
        <p className="mt-3 text-[11px] text-muted-foreground">
          For a specific period (e.g. the last 1–2 months), download that range as a statement from your bank and
          upload it here — Gmail sync (right) only looks at new emails going forward, not history.
        </p>
      </section>
    </div>
  );
}
