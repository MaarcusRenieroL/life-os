import { useQuery } from '@tanstack/react-query';
import { format, parseISO, subDays } from 'date-fns';
import { Flame, PenLine, Search } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { LineChart } from '@/components/charts';
import { EmptyState } from '@/components/empty-state';
import { SectionHeading } from '@/components/section-heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { goalsApi } from '@/features/goals/goals-api';
import { projectsApi } from '@/features/tasks/projects-goals-api';
import { useDebouncedValue } from '@/lib/use-debounced-value';

import { journalApi } from './journal-api';
import { MOOD_LABELS, type JournalEntry } from './journal-types';
import { RatingIcon } from './mood-picker';

const ALL = 'ALL';
const RANGES = [
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last year' },
  { value: ALL, label: 'All time' },
];

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-[11px] tracking-widest text-muted-foreground uppercase">{label}</p>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function EntryCard({ entry, names }: { entry: JournalEntry; names: Map<string, string> }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link to={`/notes/journal/${entry.noteId}`} className="block truncate font-medium hover:underline">
              {entry.title}
            </Link>
            <p className="text-xs text-muted-foreground">{format(parseISO(entry.entryDate), 'EEEE, MMM d, yyyy')}</p>
          </div>
          <span className="flex shrink-0 items-center gap-2">
            <RatingIcon kind="mood" value={entry.mood} className="size-5" />
            <RatingIcon kind="energy" value={entry.energy} className="size-5" />
          </span>
        </div>
        {entry.excerpt && <p className="line-clamp-3 text-sm text-muted-foreground">{entry.excerpt}</p>}
        {entry.links.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {entry.links.map((link) => (
              <Link
                key={link.id}
                to={link.moduleType === 'GOAL' ? `/goals/${link.moduleId}` : '/tasks'}
                className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
              >
                {link.moduleType === 'GOAL' ? 'Goal' : 'Project'}: {names.get(link.moduleId) ?? '…'}
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** The journal: write today's entry, see your mood and energy over time, and browse past entries. */
export function JournalPage() {
  const [range, setRange] = useState('30');
  const [mood, setMood] = useState<string>(ALL);
  const [search, setSearch] = useState('');
  const [chart, setChart] = useState<'mood' | 'energy'>('mood');
  const debounced = useDebouncedValue(search, 250);

  const from = range === ALL ? undefined : format(subDays(new Date(), Number(range) - 1), 'yyyy-MM-dd');
  const filters = { from, mood: mood === ALL ? undefined : Number(mood), q: debounced.trim() || undefined };

  const { data: entries = [], isLoading } = useQuery({ queryKey: ['notes', 'journal', 'list', filters], queryFn: () => journalApi.list(filters) });
  const { data: insights } = useQuery({
    queryKey: ['notes', 'journal', 'insights', from],
    queryFn: () => journalApi.insights(from ?? '2000-01-01', undefined),
  });
  const { data: goals = [] } = useQuery({ queryKey: ['goals', 'list', { forJournal: true }], queryFn: () => goalsApi.list({ includeArchived: true }) });
  const { data: projects = [] } = useQuery({ queryKey: ['tasks', 'projects'], queryFn: projectsApi.list });

  const names = new Map<string, string>([...goals.map((g) => [g.id, g.name] as const), ...projects.map((p) => [p.id, p.name] as const)]);

  const points = (insights?.days ?? [])
    .filter((d) => d[chart] != null)
    .map((d) => ({ label: format(parseISO(d.date), 'MMM d'), value: d[chart] as number }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Journal</h1>
        <Button asChild>
          <Link to="/notes/journal/new">
            <PenLine /> Write an entry
          </Link>
        </Button>
      </div>

      {insights && (
        <Card>
          <CardContent className="grid grid-cols-2 gap-4 py-4 sm:grid-cols-4">
            <Stat label="Streak" value={`${insights.currentStreakDays} d`} hint={`best ${insights.longestStreakDays} d`} />
            <Stat label="Entries" value={String(insights.totalEntries)} hint={range === ALL ? 'all time' : `last ${range} days`} />
            <Stat label="Avg mood" value={insights.averageMood == null ? '—' : String(insights.averageMood)} hint="out of 5" />
            <Stat label="Avg energy" value={insights.averageEnergy == null ? '—' : String(insights.averageEnergy)} hint="out of 5" />
          </CardContent>
        </Card>
      )}

      {points.length >= 2 && (
        <Card>
          <CardContent className="py-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <SectionHeading>trend</SectionHeading>
              <Tabs value={chart} onValueChange={(v) => setChart(v as typeof chart)}>
                <TabsList>
                  <TabsTrigger value="mood">Mood</TabsTrigger>
                  <TabsTrigger value="energy">Energy</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <LineChart data={points} height={140} valueFormat={(v) => `${v} / 5`} ariaLabel={`${chart} over time`} />
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search entries…" aria-label="Search entries" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="min-w-36" aria-label="Time range">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={mood} onValueChange={setMood}>
          <SelectTrigger className="min-w-32" aria-label="Filter by mood">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any mood</SelectItem>
            {[5, 4, 3, 2, 1].map((m) => (
              <SelectItem key={m} value={String(m)}>
                {MOOD_LABELS[m]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div>
          <EmptyState message="No entries here yet." />
          <Button variant="link" className="px-0" asChild>
            <Link to="/notes/journal/new">
              <Flame className="size-4" /> Start today’s entry
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {entries.map((entry) => (
            <EntryCard key={entry.noteId} entry={entry} names={names} />
          ))}
        </div>
      )}
    </div>
  );
}
