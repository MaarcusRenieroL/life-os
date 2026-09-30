import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Bell, BellOff, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { useConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

import { discoveryApi } from './discovery-api';
import { JOB_BOARDS, type JobBoard, type WatchedCompany } from './discovery-types';

function errorMessage(err: unknown, fallback: string): string {
  return (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? fallback;
}

function ago(iso: string | null): string {
  if (!iso) return 'never scanned';
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h ago`;
  return `${Math.round(minutes / 1440)}d ago`;
}

export function WatchlistPanel({ scanning }: { scanning: boolean }) {
  const queryClient = useQueryClient();
  const { confirm, dialog } = useConfirmDialog();
  const { data: companies = [] } = useQuery({
    queryKey: ['jobs', 'discovery', 'companies'],
    queryFn: discoveryApi.companies,
    // A background scan updates rows one company at a time; poll so progress is visible.
    refetchInterval: scanning ? 3000 : false,
  });

  const [name, setName] = useState('');
  const [board, setBoard] = useState<JobBoard>('GREENHOUSE');
  const [slug, setSlug] = useState('');
  const [scanningId, setScanningId] = useState<string | null>(null);

  const hint = JOB_BOARDS.find((b) => b.value === board)?.hint ?? '';

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['jobs', 'discovery'] });
  }

  const add = useMutation({
    mutationFn: async () => {
      const created = await discoveryApi.addCompany({ name: name.trim(), board, slug: slug.trim() });
      // Scan straight away so the first result (and any bad slug) shows up immediately.
      const result = await discoveryApi.scanCompany(created.id);
      return { created, result };
    },
    onSuccess: ({ created, result }) => {
      setName('');
      setSlug('');
      refresh();
      if (result.errors.length) toast.error(result.errors[0]);
      else toast.success(`${created.name}: ${result.newOpenings} openings found`);
    },
    onError: (err) => toast.error(errorMessage(err, 'Could not add that company.')),
  });

  async function rescan(company: WatchedCompany) {
    setScanningId(company.id);
    try {
      const result = await discoveryApi.scanCompany(company.id);
      if (result.errors.length) toast.error(result.errors[0]);
      else toast.success(`${company.name}: ${result.newOpenings} new, ${result.closedOpenings} closed`);
    } catch (err) {
      toast.error(errorMessage(err, 'Scan failed.'));
    } finally {
      setScanningId(null);
      refresh();
    }
  }

  async function toggleAlert(company: WatchedCompany) {
    await discoveryApi.updateCompany(company.id, { alert: !company.alert });
    refresh();
  }

  async function remove(company: WatchedCompany) {
    const ok = await confirm({
      title: `Stop watching ${company.name}?`,
      description: 'Its discovered openings are removed from your inbox. Jobs you already added to your pipeline stay.',
      confirmLabel: 'Remove',
    });
    if (!ok) return;
    await discoveryApi.removeCompany(company.id);
    refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex flex-col gap-2 rounded-lg border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim() && slug.trim()) add.mutate();
        }}
      >
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Company name" />
        <Select value={board} onValueChange={(v) => setBoard(v as JobBoard)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {JOB_BOARDS.map((b) => (
              <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="Board slug" />
        <p className="text-xs text-muted-foreground">e.g. {hint}</p>
        <Button type="submit" disabled={add.isPending || !name.trim() || !slug.trim()}>
          {add.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Add &amp; scan
        </Button>
      </form>

      <ul className="flex flex-col gap-2">
        {companies.length === 0 && (
          <li className="text-sm text-muted-foreground">
            No companies yet. Add one above and its open roles are pulled in right away.
          </li>
        )}
        {companies.map((company) => (
          <li key={company.id} className="rounded-lg border p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-medium">{company.name}</div>
                <div className="text-xs text-muted-foreground">
                  {company.board.toLowerCase()} · {company.lastOpenCount ?? '—'} open · {ago(company.lastFetchedAt)}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  title={company.alert ? 'Alerts on' : 'Alerts off'}
                  onClick={() => void toggleAlert(company)}
                >
                  {company.alert ? <Bell className="size-4" /> : <BellOff className="size-4 text-muted-foreground" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Scan now"
                  disabled={scanningId === company.id}
                  onClick={() => void rescan(company)}
                >
                  <RefreshCw className={scanningId === company.id ? 'size-4 animate-spin' : 'size-4'} />
                </Button>
                <Button variant="ghost" size="icon" title="Remove" onClick={() => void remove(company)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
            {company.lastFetchError && (
              <p className="mt-2 flex items-start gap-1.5 text-xs text-destructive">
                <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                <span className="break-words">{company.lastFetchError}</span>
              </p>
            )}
            <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Switch
                size="sm"
                checked={company.active}
                onCheckedChange={async (active) => {
                  await discoveryApi.updateCompany(company.id, { active });
                  refresh();
                }}
              />
              Include in daily scan
            </label>
          </li>
        ))}
      </ul>
      {dialog}
    </div>
  );
}
