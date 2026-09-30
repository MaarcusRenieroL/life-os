import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { useConfirmDialog } from '@/components/confirm-dialog';
import { DatePicker } from '@/components/date-time-picker';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getErrorMessage } from '@/lib/error';

import { LineChart } from '@/components/charts';
import type { Measurement } from './types';
import { formatNumber, parseNumber } from './utils';
import { workoutsApi } from './workouts-api';

type Field = 'weightKg' | 'chestCm' | 'waistCm' | 'armsCm' | 'legsCm' | 'bodyFatPct';

const FIELDS: { key: Field; label: string; unit: string }[] = [
  { key: 'weightKg', label: 'Weight', unit: 'kg' },
  { key: 'bodyFatPct', label: 'Body fat', unit: '%' },
  { key: 'chestCm', label: 'Chest', unit: 'cm' },
  { key: 'waistCm', label: 'Waist', unit: 'cm' },
  { key: 'armsCm', label: 'Arms', unit: 'cm' },
  { key: 'legsCm', label: 'Legs', unit: 'cm' },
];

function MeasurementDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const [date, setDate] = useState<string | null>(null);
  const [values, setValues] = useState<Record<Field, string>>({ weightKg: '', chestCm: '', waistCm: '', armsCm: '', legsCm: '', bodyFatPct: '' });
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setDate(null);
      setValues({ weightKg: '', chestCm: '', waistCm: '', armsCm: '', legsCm: '', bodyFatPct: '' });
      setNotes('');
    }
  }

  const anyValue = FIELDS.some((f) => parseNumber(values[f.key]) != null);

  async function submit() {
    setSaving(true);
    try {
      await workoutsApi.createMeasurement({
        measuredOn: date,
        weightKg: parseNumber(values.weightKg),
        chestCm: parseNumber(values.chestCm),
        waistCm: parseNumber(values.waistCm),
        armsCm: parseNumber(values.armsCm),
        legsCm: parseNumber(values.legsCm),
        bodyFatPct: parseNumber(values.bodyFatPct),
        notes: notes.trim() || null,
      });
      toast.success('Measurements saved');
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save the measurements.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log measurements</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label>Date</Label>
          <DatePicker value={date} onChange={setDate} placeholder="Today" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {FIELDS.map((field) => (
            <div key={field.key} className="flex flex-col gap-1.5">
              <Label htmlFor={`m-${field.key}`}>
                {field.label} ({field.unit})
              </Label>
              <Input
                id={`m-${field.key}`}
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={values[field.key]}
                onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
              />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="m-notes">Notes</Label>
          <Input id="m-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
        </div>
        <p className="text-xs text-muted-foreground">Fill in whatever you measured - one number is enough.</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={saving || !anyValue}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Body measurements over time - weight, body fat and tape measurements - with a trend chart per
 * measurement. */
export function BodyPage() {
  const queryClient = useQueryClient();
  const { confirm, dialog } = useConfirmDialog();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [field, setField] = useState<Field>('weightKg');

  const { data: measurements = [], isLoading } = useQuery({ queryKey: ['workouts', 'measurements'], queryFn: () => workoutsApi.measurements() });

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['workouts', 'measurements'] });
  }

  async function remove(m: Measurement) {
    if (!(await confirm({ title: `Delete the ${format(parseISO(m.measuredOn), 'MMM d')} entry?`, confirmLabel: 'Delete' }))) return;
    try {
      await workoutsApi.deleteMeasurement(m.id);
      invalidate();
    } catch {
      toast.error('Could not delete the entry.');
    }
  }

  const meta = FIELDS.find((f) => f.key === field)!;
  // The list comes newest first; charts read oldest to newest.
  const series = [...measurements]
    .reverse()
    .filter((m) => m[field] != null)
    .map((m) => ({ label: format(parseISO(m.measuredOn), 'MMM d'), value: m[field] as number }));
  const first = series[0]?.value;
  const last = series[series.length - 1]?.value;
  const change = first != null && last != null ? last - first : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Body</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus /> Log measurements
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : measurements.length === 0 ? (
        <EmptyState message="No measurements yet - log your weight or tape measurements to see the trend." />
      ) : (
        <>
          <Card>
            <CardContent className="py-4">
              <Tabs value={field} onValueChange={(v) => setField(v as Field)}>
                <TabsList className="flex-wrap">
                  {FIELDS.map((f) => (
                    <TabsTrigger key={f.key} value={f.key}>
                      {f.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <div className="mt-4">
                {series.length === 0 ? (
                  <EmptyState message={`No ${meta.label.toLowerCase()} entries yet.`} />
                ) : (
                  <>
                    <p className="mb-2 text-sm text-muted-foreground">
                      Now <span className="font-semibold text-foreground">{formatNumber(last!, 2)} {meta.unit}</span>
                      {change != null && series.length > 1 && (
                        <>
                          {' · '}
                          {change > 0 ? '+' : ''}
                          {formatNumber(change, 2)} {meta.unit} since {series[0].label}
                        </>
                      )}
                    </p>
                    <LineChart data={series} valueFormat={(v) => `${v} ${meta.unit}`} ariaLabel={`${meta.label} trend`} />
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                {FIELDS.map((f) => (
                  <TableHead key={f.key} className="text-right">
                    {f.label}
                  </TableHead>
                ))}
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {measurements.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{format(parseISO(m.measuredOn), 'MMM d, yyyy')}</TableCell>
                  {FIELDS.map((f) => (
                    <TableCell key={f.key} className="text-right tabular-nums">
                      {m[f.key] == null ? '—' : formatNumber(m[f.key] as number, 2)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" aria-label={`Delete ${m.measuredOn} entry`} onClick={() => void remove(m)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}

      <MeasurementDialog open={dialogOpen} onOpenChange={setDialogOpen} onSaved={invalidate} />
      {dialog}
    </div>
  );
}
