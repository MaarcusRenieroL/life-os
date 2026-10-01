import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

import { jobApi } from './job-api';
import type { ImportCandidate } from './types';

const SOURCES = [
  { id: 'naukri', label: 'Naukri', steps: 'Open Naukri → your profile menu → Applied jobs. Select the whole page (Ctrl/⌘ + A), copy, and paste below.' },
  { id: 'indeed', label: 'Indeed', steps: 'Open Indeed → My jobs → Applied. Select the whole page (Ctrl/⌘ + A), copy, and paste below.' },
  { id: 'other', label: 'Other site', steps: 'Open the page that lists the jobs you applied to, select everything (Ctrl/⌘ + A), copy, and paste below.' },
] as const;

/**
 * Brings in applications made on another job board. The text of the board's "Applied jobs" page is
 * pasted, the server reads it into a list, and nothing is saved until the rows are confirmed - so
 * there is no password to hand over and nothing is added that looks wrong.
 */
export function ImportApplicationsDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: (created: number) => void;
}) {
  const [source, setSource] = useState<(typeof SOURCES)[number]['id']>('naukri');
  const [text, setText] = useState('');
  const [rows, setRows] = useState<ImportCandidate[] | null>(null);
  const [chosen, setChosen] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const current = SOURCES.find((s) => s.id === source)!;

  function reset() {
    setText('');
    setRows(null);
    setChosen(new Set());
    setError('');
  }

  function close(next: boolean) {
    if (busy) return;
    if (!next) reset();
    onOpenChange(next);
  }

  async function read() {
    if (!text.trim()) {
      setError('Paste the page text first.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const found = await jobApi.previewImport(text);
      setRows(found);
      // Everything new is ticked; what is already tracked starts unticked.
      setChosen(new Set(found.map((r, i) => (r.duplicate ? -1 : i)).filter((i) => i >= 0)));
      if (found.length === 0) setError('No applications found in that text. Make sure you copied the whole Applied jobs page.');
    } catch (err) {
      const response = (err as { response?: { data?: { message?: string } } }).response;
      setError(response?.data?.message ?? 'Could not read that text.');
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!rows) return;
    const items = rows.filter((_, i) => chosen.has(i)).map(({ title, company, location, appliedOn }) => ({ title, company, location, appliedOn }));
    if (items.length === 0) return;
    setBusy(true);
    setError('');
    try {
      const result = await jobApi.importApplied(source, items);
      onImported(result.created);
      reset();
      onOpenChange(false);
    } catch (err) {
      const response = (err as { response?: { data?: { message?: string } } }).response;
      setError(response?.data?.message ?? 'Could not import those applications.');
    } finally {
      setBusy(false);
    }
  }

  const toggle = (i: number) =>
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import applied jobs</DialogTitle>
          <DialogDescription>Bring in applications you made on another site. Nothing is saved until you confirm the list.</DialogDescription>
        </DialogHeader>

        {rows === null ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-1.5">
              {SOURCES.map((s) => (
                <Button key={s.id} size="sm" variant={source === s.id ? 'secondary' : 'outline'} onClick={() => setSource(s.id)} disabled={busy}>
                  {s.label}
                </Button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">{current.steps}</p>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              placeholder="Paste the copied page text here…"
              disabled={busy}
              aria-label="Applied jobs page text"
            />
            {busy && <p className="text-sm text-muted-foreground">Reading your applications… the local model works through the list in pieces, so a long list can take a few minutes.</p>}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Found {rows.length} application{rows.length === 1 ? '' : 's'}; {chosen.size} selected. Untick anything that looks wrong. Rows marked “already tracked” are skipped.
            </p>
            <div className="max-h-96 overflow-y-auto rounded-md border">
              {rows.map((row, i) => (
                <label key={i} className="flex cursor-pointer items-start gap-3 border-b px-3 py-2 last:border-b-0 hover:bg-accent/50">
                  <Checkbox checked={chosen.has(i)} onCheckedChange={() => toggle(i)} className="mt-1" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{row.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {row.company}
                      {row.location ? ` · ${row.location}` : ''}
                      {row.appliedOn ? ` · applied ${row.appliedOn}` : ''}
                    </span>
                  </span>
                  {row.duplicate && <span className="rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground uppercase">already tracked</span>}
                </label>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          {rows === null ? (
            <>
              <Button variant="outline" onClick={() => close(false)} disabled={busy}>Cancel</Button>
              <Button onClick={() => void read()} disabled={busy || !text.trim()}>{busy ? 'Reading…' : 'Read my applications'}</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={reset} disabled={busy}>Back</Button>
              <Button onClick={() => void save()} disabled={busy || chosen.size === 0}>
                {busy ? 'Importing…' : `Import ${chosen.size} job${chosen.size === 1 ? '' : 's'}`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
