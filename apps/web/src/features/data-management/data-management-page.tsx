import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { SectionHeading } from '@/components/section-heading';
import { Button } from '@/components/ui/button';
import { auditLogApi } from '@/features/audit-log/audit-log-api';
import { DeleteAccountDialog } from '@/features/settings/delete-account-dialog';
import { vaultApi } from '@/features/vault/vault-api';
import type { VaultEntryWriteRequest } from '@/features/vault/types';

import { backupApi } from './backup-api';
import { parseCsv } from './parse-csv';

export function DataManagementPage() {
  const { data: latestBackup } = useQuery({ queryKey: ['vault', 'backup', 'latest'], queryFn: backupApi.getLatest });
  const fileInput = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<Awaited<ReturnType<typeof vaultApi.bulkCreateEntries>> | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);

  async function exportVault() {
    const data = await vaultApi.exportVault();
    downloadJson(data, 'vault-export.json');
  }

  async function downloadEverything() {
    const [vault, auditLog] = await Promise.all([vaultApi.exportVault(), auditLogApi.getEvents()]);
    downloadJson({ vault, auditLog, settings: {} }, 'life-os-data-export.json');
  }

  async function onImportFile(file: File) {
    setImportError(null);
    setImportResult(null);
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length === 0) {
      setImportError('That file has no rows.');
      return;
    }
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const titleIdx = header.indexOf('title');
    if (titleIdx === -1) {
      setImportError('The CSV needs at least a "title" column.');
      return;
    }
    const urlIdx = header.indexOf('url');
    const usernameIdx = header.indexOf('username');
    const passwordIdx = header.indexOf('password');

    const entries: VaultEntryWriteRequest[] = rows.slice(1).map((cells) => ({
      type: 'LOGIN',
      title: cells[titleIdx] ?? '',
      url: urlIdx >= 0 ? cells[urlIdx] : undefined,
      username: usernameIdx >= 0 ? cells[usernameIdx] : undefined,
      password: passwordIdx >= 0 ? cells[passwordIdx] : undefined,
    }));

    try {
      const result = await vaultApi.bulkCreateEntries(entries);
      setImportResult(result);
    } catch (err) {
      setImportError(
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Import failed.',
      );
    }
  }

  async function restore() {
    if (!confirm('Restore from the latest backup? This overwrites current vault data.')) return;
    setRestoring(true);
    try {
      await backupApi.restoreBackup();
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Data management</h1>

      <section className="mt-6 rounded-lg border bg-card p-5">
        <SectionHeading>Export vault</SectionHeading>
        <p className="mt-1 text-xs text-muted-foreground">Downloads every entry and card, fully decrypted, as JSON.</p>
        <Button size="sm" variant="outline" className="mt-3" onClick={() => void exportVault()}>
          Export vault
        </Button>
      </section>

      <section className="mt-4 rounded-lg border bg-card p-5">
        <SectionHeading>Import from another manager</SectionHeading>
        <p className="mt-1 text-xs text-muted-foreground">
          CSV with at least a "title" column. "url", "username", "password" are matched by header name if present.
        </p>
        <input
          ref={fileInput}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onImportFile(file);
            e.target.value = '';
          }}
        />
        <Button size="sm" variant="outline" className="mt-3" onClick={() => fileInput.current?.click()}>
          Choose CSV file
        </Button>
        {importError && <p className="mt-2 text-sm text-destructive">{importError}</p>}
        {importResult && (
          <p className="mt-2 text-sm text-muted-foreground">
            Imported {importResult.importedCount}, failed {importResult.failedCount}.
            {importResult.errors.length > 0 && (
              <ul className="mt-1 list-disc pl-4 text-xs">
                {importResult.errors.map((e) => (
                  <li key={e.rowIndex}>Row {e.rowIndex}: {e.message}</li>
                ))}
              </ul>
            )}
          </p>
        )}
      </section>

      <section className="mt-4 rounded-lg border bg-card p-5">
        <SectionHeading>Backup &amp; recovery</SectionHeading>
        <p className="mt-1 text-xs text-muted-foreground">
          Last backup: {latestBackup ? new Date(latestBackup.createdAt).toLocaleString() : 'No backups yet'}
        </p>
        <Button size="sm" variant="outline" className="mt-3" onClick={() => void restore()} disabled={restoring}>
          {restoring ? 'Restoring…' : 'Restore from backup'}
        </Button>
      </section>

      <section className="mt-4 rounded-lg border bg-card p-5">
        <SectionHeading>Encryption</SectionHeading>
        <p className="mt-1 text-xs text-muted-foreground">AES-256, zero-knowledge — only you hold the key.</p>
        <span className="mt-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">active</span>
      </section>

      <section className="mt-4 rounded-lg border bg-card p-5">
        <SectionHeading>Download everything</SectionHeading>
        <p className="mt-1 text-xs text-muted-foreground">Vault entries, cards, and audit log in one file.</p>
        <Button size="sm" variant="outline" className="mt-3" onClick={() => void downloadEverything()}>
          Download everything
        </Button>
      </section>

      <section className="mt-4 rounded-lg border border-destructive/35 bg-card p-5">
        <SectionHeading tone="destructive">Danger zone</SectionHeading>
        <p className="mt-1 text-xs text-muted-foreground">
          Permanently deletes your vault and account. This cannot be undone.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="mt-3 border-destructive/50 text-destructive hover:bg-destructive/10"
          onClick={() => setDeleteAccountOpen(true)}
        >
          Delete account
        </Button>
      </section>

      <DeleteAccountDialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen} />
    </div>
  );
}

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
