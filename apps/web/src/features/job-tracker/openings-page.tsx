import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, ListChecks, Plus, Radar, SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';

import { discoveryApi } from './discovery-api';
import type { DiscoveredJob } from './discovery-types';
import { DiscoveryPreferencesForm } from './discovery-preferences-form';
import { FitScoreBadge } from './fit-score-badge';
import { WatchlistPanel } from './watchlist-sheet';

const ALL = 'ALL';
const MIN_SCORES = [
  { value: '0', label: 'Any fit' },
  { value: '40', label: '40+' },
  { value: '60', label: '60+' },
  { value: '75', label: '75+' },
];

function firstSeen(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return 'today';
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

function isRecent(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < 3 * 86_400_000;
}

export function OpeningsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [minScore, setMinScore] = useState('60');
  const [companyId, setCompanyId] = useState(ALL);
  const [panel, setPanel] = useState<'watchlist' | 'preferences' | null>(null);
  const [scanning, setScanning] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: companies = [] } = useQuery({
    queryKey: ['jobs', 'discovery', 'companies'],
    queryFn: discoveryApi.companies,
    refetchInterval: scanning ? 3000 : false,
  });
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['jobs', 'discovery', 'jobs', minScore, companyId],
    queryFn: () =>
      discoveryApi.jobs({ minScore: Number(minScore), companyId: companyId === ALL ? undefined : companyId }),
    refetchInterval: scanning ? 5000 : false,
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['jobs', 'discovery'] });
  }

  const scanAll = useMutation({
    mutationFn: discoveryApi.scanAll,
    onSuccess: (started) => {
      if (!started) {
        toast.info('A scan is already running.');
        return;
      }
      setScanning(true);
      toast.success('Scanning your watchlist…');
      // The scan runs server-side; stop polling once it has had time to finish every board.
      setTimeout(() => {
        setScanning(false);
        refresh();
      }, 90_000);
    },
    onError: () => toast.error('Could not start a scan.'),
  });

  async function promote(job: DiscoveredJob) {
    setBusyId(job.id);
    try {
      const created = await discoveryApi.promote(job.id);
      // Refresh the whole jobs namespace so the pipeline list and dashboard pick it up too.
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success(`Added ${job.title} to your pipeline`, {
        action: { label: 'Open', onClick: () => navigate(`/jobs/${created.id}`) },
      });
    } catch {
      toast.error('Could not add that job.');
    } finally {
      setBusyId(null);
    }
  }

  async function dismiss(job: DiscoveredJob) {
    setBusyId(job.id);
    try {
      await discoveryApi.dismiss(job.id);
      refresh();
    } finally {
      setBusyId(null);
    }
  }

  const noCompanies = companies.length === 0;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Openings</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            New roles from the career boards you watch, ranked by how many of your skills the posting
            names. Add the good ones to your pipeline; nothing is applied to on your behalf.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPanel('preferences')}>
            <SlidersHorizontal className="size-4" /> Preferences
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPanel('watchlist')}>
            <ListChecks className="size-4" /> Watchlist
            {companies.length > 0 && <Badge variant="secondary">{companies.length}</Badge>}
          </Button>
          <Button size="sm" disabled={noCompanies || scanning || scanAll.isPending} onClick={() => scanAll.mutate()}>
            <Radar className={scanning ? 'size-4 animate-pulse' : 'size-4'} />
            {scanning ? 'Scanning…' : 'Scan now'}
          </Button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Select value={minScore} onValueChange={setMinScore}>
          <SelectTrigger size="sm" className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MIN_SCORES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={companyId} onValueChange={setCompanyId}>
          <SelectTrigger size="sm" className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All companies</SelectItem>
            {companies.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{jobs.length} shown</span>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {isLoading && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-20 w-full" />)}

        {!isLoading && noCompanies && (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="font-medium">Watch a few companies to get started</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add companies whose career pages run on Greenhouse, Ashby, Lever, Workday and similar.
              Their current roles are pulled in immediately, then re-checked daily.
            </p>
            <Button className="mt-4" size="sm" onClick={() => setPanel('watchlist')}>
              <Plus className="size-4" /> Add a company
            </Button>
          </div>
        )}

        {!isLoading && !noCompanies && jobs.length === 0 && (
          <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Nothing at this fit level. Lower the minimum, widen your title filters under Preferences, or
            run a scan.
          </p>
        )}

        {jobs.map((job) => (
          <div key={job.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium">{job.title}</span>
                {isRecent(job.firstSeenAt) && (
                  <Badge variant="secondary" className="shrink-0">New</Badge>
                )}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {job.company} · {job.location || 'Location not listed'} · found {firstSeen(job.firstSeenAt)}
              </div>
              {job.fitExplanation?.matchedSkills && job.fitExplanation.matchedSkills.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {job.fitExplanation.matchedSkills.slice(0, 6).map((skill) => (
                    <Badge key={skill} variant="outline" className="text-[10px]">{skill}</Badge>
                  ))}
                </div>
              )}
              {job.fitExplanation?.caps && job.fitExplanation.caps.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">{job.fitExplanation.caps[0]}</p>
              )}
            </div>
            {job.fitScore !== null && <FitScoreBadge score={job.fitScore} />}
            <div className="flex items-center gap-1">
              {job.url && (
                <Button variant="ghost" size="icon" asChild title="Open the posting">
                  <a href={job.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-4" />
                  </a>
                </Button>
              )}
              <Button size="sm" disabled={busyId === job.id} onClick={() => void promote(job)}>
                <Plus className="size-4" /> Track
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title="Dismiss"
                disabled={busyId === job.id}
                onClick={() => void dismiss(job)}
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Sheet open={panel !== null} onOpenChange={(open) => !open && setPanel(null)}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{panel === 'watchlist' ? 'Watchlist' : 'Preferences'}</SheetTitle>
            <SheetDescription>
              {panel === 'watchlist'
                ? 'Companies whose career boards are checked every morning.'
                : 'What counts as a match, and when to be notified.'}
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            {panel === 'watchlist' && <WatchlistPanel scanning={scanning} />}
            {panel === 'preferences' && <DiscoveryPreferencesForm onSaved={() => setPanel(null)} />}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
