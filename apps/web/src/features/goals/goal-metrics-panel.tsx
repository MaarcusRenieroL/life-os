import { format, parseISO } from 'date-fns';
import { LineChart, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { useConfirmDialog } from '@/components/confirm-dialog';
import { DatePicker } from '@/components/date-time-picker';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getErrorMessage } from '@/lib/error';

import { GoalProgressBar } from './goal-badges';
import { goalsApi } from './goals-api';
import {
  GOAL_METRIC_DEFAULT_UNITS,
  GOAL_METRIC_TYPES,
  GOAL_METRIC_TYPE_LABELS,
  type GoalMetric,
  type GoalMetricType,
} from './types';

function fmt(value: number, unit: string | null): string {
  const text = Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '');
  if (!unit) return text;
  // Currency-style units read "$1,200"; the rest read "82 kg".
  return unit === '$' ? `$${text}` : `${text} ${unit}`;
}

/** Sparkline of a metric's logged entries, oldest to newest, with the start and target as dashed
 * reference lines so it's clear which way "progress" runs. */
function MetricSparkline({ metric }: { metric: GoalMetric }) {
  const points = [...metric.entries].reverse();
  if (points.length < 2) return null;

  const width = 240;
  const height = 56;
  const values = [...points.map((p) => p.value), metric.startValue, metric.targetValue];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => 4 + (i / (points.length - 1)) * (width - 8);
  const y = (v: number) => 4 + (1 - (v - min) / span) * (height - 8);
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.value)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-14 w-full" role="img" aria-label={`${metric.name} history`}>
      <line x1="0" x2={width} y1={y(metric.targetValue)} y2={y(metric.targetValue)} className="stroke-primary/50" strokeDasharray="3 3" />
      <line x1="0" x2={width} y1={y(metric.startValue)} y2={y(metric.startValue)} className="stroke-muted-foreground/40" strokeDasharray="3 3" />
      <path d={path} fill="none" className="stroke-primary" strokeWidth="2" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={p.id} cx={x(i)} cy={y(p.value)} r="2.5" className="fill-primary" />
      ))}
    </svg>
  );
}

function MetricDialog({
  goalId,
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  goalId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: GoalMetric | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<GoalMetricType>('COUNT');
  const [unit, setUnit] = useState('');
  const [start, setStart] = useState('0');
  const [target, setTarget] = useState('');
  const [saving, setSaving] = useState(false);

  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setName(editing?.name ?? '');
      setType(editing?.metricType ?? 'COUNT');
      setUnit(editing?.unit ?? '');
      setStart(editing ? String(editing.startValue) : '0');
      setTarget(editing ? String(editing.targetValue) : '');
    }
  }

  function pickType(next: GoalMetricType) {
    // Follow the type's default unit only while the user hasn't typed their own.
    if (unit === '' || unit === GOAL_METRIC_DEFAULT_UNITS[type]) setUnit(GOAL_METRIC_DEFAULT_UNITS[next]);
    setType(next);
  }

  const valid = name.trim() !== '' && target.trim() !== '' && !Number.isNaN(Number(target)) && !Number.isNaN(Number(start));

  async function submit() {
    if (!valid) return;
    setSaving(true);
    try {
      const request = {
        name: name.trim(),
        metricType: type,
        unit: unit.trim() || null,
        startValue: Number(start),
        targetValue: Number(target),
      };
      if (editing) await goalsApi.updateMetric(goalId, editing.id, request);
      else await goalsApi.addMetric(goalId, request);
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save the metric. Please try again.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit metric' : 'New metric'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="metric-name">Name</Label>
          <Input id="metric-name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder="Body weight" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => pickType(v as GoalMetricType)}>
              <SelectTrigger aria-label="Metric type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GOAL_METRIC_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {GOAL_METRIC_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="metric-unit">Unit</Label>
            <Input id="metric-unit" value={unit} maxLength={20} onChange={(e) => setUnit(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="metric-start">Starting value</Label>
            <Input id="metric-start" type="number" step="any" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="metric-target">Target value</Label>
            <Input id="metric-target" type="number" step="any" value={target} onChange={(e) => setTarget(e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">A target below the start (e.g. losing weight) works too.</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={saving || !valid}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LogEntryDialog({
  goalId,
  metric,
  onOpenChange,
  onSaved,
}: {
  goalId: string;
  metric: GoalMetric | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const [recordedOn, setRecordedOn] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [lastMetric, setLastMetric] = useState<string | null>(null);
  if ((metric?.id ?? null) !== lastMetric) {
    setLastMetric(metric?.id ?? null);
    setValue('');
    setNote('');
    setRecordedOn(null);
  }

  const valid = value.trim() !== '' && !Number.isNaN(Number(value));

  async function submit() {
    if (!metric || !valid) return;
    setSaving(true);
    try {
      await goalsApi.logMetricEntry(goalId, metric.id, { value: Number(value), note: note.trim() || null, recordedOn });
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not log the entry. Please try again.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={metric !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log {metric?.name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="entry-value">Value{metric?.unit ? ` (${metric.unit})` : ''}</Label>
          <Input id="entry-value" type="number" step="any" autoFocus value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Date</Label>
          <DatePicker value={recordedOn} onChange={setRecordedOn} placeholder="Today" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="entry-note">Note</Label>
          <Input id="entry-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={saving || !valid}>
            {saving ? 'Saving…' : 'Log entry'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function GoalMetricsPanel({
  goalId,
  metrics,
  onChanged,
}: {
  goalId: string;
  metrics: GoalMetric[];
  onChanged: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GoalMetric | null>(null);
  const [logging, setLogging] = useState<GoalMetric | null>(null);
  const { confirm, dialog } = useConfirmDialog();

  async function remove(metric: GoalMetric) {
    if (!(await confirm({ title: `Delete “${metric.name}” and all its entries?`, confirmLabel: 'Delete' }))) return;
    try {
      await goalsApi.deleteMetric(goalId, metric.id);
      onChanged();
    } catch {
      toast.error('Could not delete the metric. Please try again.');
    }
  }

  async function removeEntry(metric: GoalMetric, entryId: string) {
    try {
      await goalsApi.deleteMetricEntry(goalId, metric.id, entryId);
      onChanged();
    } catch {
      toast.error('Could not delete the entry. Please try again.');
    }
  }

  return (
    <div>
      {metrics.length === 0 ? (
        <EmptyState message="No metrics yet - track a number like weight, savings or hours." />
      ) : (
        <div className="flex flex-col gap-3">
          {metrics.map((metric) => (
            <div key={metric.id} className="rounded-md border p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{metric.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmt(metric.startValue, metric.unit)} → {fmt(metric.targetValue, metric.unit)} · now{' '}
                    <span className="font-semibold text-foreground">{fmt(metric.currentValue, metric.unit)}</span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center">
                  <Button size="sm" variant="outline" onClick={() => setLogging(metric)}>
                    <LineChart /> Log
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Edit ${metric.name}`}
                    onClick={() => {
                      setEditing(metric);
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button size="icon" variant="ghost" aria-label={`Delete ${metric.name}`} onClick={() => void remove(metric)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <GoalProgressBar pct={metric.progressPct} />
                <span className="w-10 text-right text-xs font-semibold tabular-nums">{metric.progressPct}%</span>
              </div>
              <MetricSparkline metric={metric} />
              {metric.entries.length > 0 && (
                <ul className="mt-2 flex max-h-32 flex-col gap-1 overflow-y-auto text-xs">
                  {metric.entries.map((entry) => (
                    <li key={entry.id} className="group flex items-center justify-between gap-2 text-muted-foreground">
                      <span>
                        {format(parseISO(entry.recordedOn), 'MMM d')} ·{' '}
                        <span className="font-medium text-foreground">{fmt(entry.value, metric.unit)}</span>
                        {entry.note && <span> · {entry.note}</span>}
                      </span>
                      <button
                        type="button"
                        aria-label="Delete entry"
                        className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                        onClick={() => void removeEntry(metric, entry.id)}
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
      <Button
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={() => {
          setEditing(null);
          setDialogOpen(true);
        }}
      >
        <Plus /> Add metric
      </Button>

      <MetricDialog goalId={goalId} open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} onSaved={onChanged} />
      <LogEntryDialog goalId={goalId} metric={logging} onOpenChange={(open) => !open && setLogging(null)} onSaved={onChanged} />
      {dialog}
    </div>
  );
}
