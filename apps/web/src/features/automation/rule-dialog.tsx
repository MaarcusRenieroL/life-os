import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

import { SearchableSelect } from '@/components/searchable-select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { goalsApi } from '@/features/goals/goals-api';
import { getErrorMessage } from '@/lib/error';

import { automationApi } from './automation-api';
import { ACTION_TYPES, ENTITY_TYPES, THRESHOLD_METRICS, TRIGGER_TYPES, type ActionType, type AutomationRule, type TriggerType } from './types';

const DAYS = [
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
  { value: '7', label: 'Sunday' },
];

const PRIORITIES = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];
const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED'];
const GOAL_STATUSES = ['ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED'];
const EVENT_CATEGORIES = ['WORK', 'PERSONAL', 'FOCUS', 'GYM', 'JOB', 'OTHER'];

const str = (v: unknown, fallback = '') => (v == null ? fallback : String(v));

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Pick({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; label: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const plain = (values: string[]) => values.map((v) => ({ value: v, label: v.replace('_', ' ').toLowerCase() }));

/** Builds a rule: pick a trigger and its details, pick an action and its details. The server
 * validates everything again and its message is shown as-is if something is off. */
export function RuleDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: AutomationRule | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [trigger, setTrigger] = useState<TriggerType>('ON_CREATE');
  const [action, setAction] = useState<ActionType>('SEND_NOTIFICATION');
  const [t, setT] = useState<Record<string, string>>({});
  const [a, setA] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: goals = [] } = useQuery({ queryKey: ['goals', 'list', { forAutomation: true }], queryFn: () => goalsApi.list(), enabled: open });

  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setName(editing?.name ?? '');
      setDescription(editing?.description ?? '');
      setTrigger(editing?.triggerType ?? 'ON_CREATE');
      setAction(editing?.actionType ?? 'SEND_NOTIFICATION');
      const tc = editing?.triggerConfig ?? { entityType: 'TASK' };
      const conditions = (tc.conditions as Record<string, unknown> | undefined) ?? {};
      setT({
        entityType: str(tc.entityType, 'TASK'),
        status: str(conditions.status),
        priority: str(conditions.priority),
        titleContains: str(conditions.titleContains),
        frequency: str(tc.frequency, 'DAILY'),
        time: str(tc.time, '09:00'),
        dayOfWeek: str(tc.dayOfWeek, '1'),
        dayOfMonth: str(tc.dayOfMonth, '1'),
        metric: str(tc.metric, 'GOAL_PROGRESS_BELOW'),
        value: str(tc.value, '25'),
        goalId: str(tc.goalId),
      });
      const ac = editing?.actionConfig ?? {};
      setA({
        title: str(ac.title),
        body: str(ac.body),
        description: str(ac.description),
        priority: str(ac.priority, 'MEDIUM'),
        dueInDays: str(ac.dueInDays, '3'),
        goalId: str(ac.goalId),
        startInDays: str(ac.startInDays, '1'),
        hour: str(ac.hour, '9'),
        durationMinutes: str(ac.durationMinutes, '60'),
        category: str(ac.category, 'OTHER'),
        status: str(ac.status, 'IN_PROGRESS'),
        period: str(ac.period, 'WEEK'),
      });
      setError(null);
    }
  }

  const setTv = (k: string, v: string) => setT({ ...t, [k]: v });
  const setAv = (k: string, v: string) => setA({ ...a, [k]: v });
  const isEvent = trigger === 'ON_CREATE' || trigger === 'ON_COMPLETE' || trigger === 'ON_UPDATE';
  const goalOptions = goals.map((g) => ({ id: g.id, label: g.name }));

  function triggerConfig(): Record<string, unknown> {
    if (isEvent) {
      const conditions: Record<string, string> = {};
      if (t.status.trim()) conditions.status = t.status.trim();
      if (t.priority.trim()) conditions.priority = t.priority.trim();
      if (t.titleContains.trim()) conditions.titleContains = t.titleContains.trim();
      return Object.keys(conditions).length ? { entityType: t.entityType, conditions } : { entityType: t.entityType };
    }
    if (trigger === 'SCHEDULED') {
      const c: Record<string, unknown> = { frequency: t.frequency, time: t.time };
      if (t.frequency === 'WEEKLY') c.dayOfWeek = Number(t.dayOfWeek);
      if (t.frequency === 'MONTHLY') c.dayOfMonth = Number(t.dayOfMonth);
      return c;
    }
    const c: Record<string, unknown> = { metric: t.metric, value: Number(t.value) };
    if (t.metric === 'GOAL_PROGRESS_BELOW' && t.goalId) c.goalId = t.goalId;
    return c;
  }

  function actionConfig(): Record<string, unknown> {
    switch (action) {
      case 'CREATE_TASK': {
        const c: Record<string, unknown> = { title: a.title, priority: a.priority, dueInDays: Number(a.dueInDays) };
        if (a.description.trim()) c.description = a.description;
        if (a.goalId) c.goalId = a.goalId;
        return c;
      }
      case 'CREATE_EVENT':
        return { title: a.title, startInDays: Number(a.startInDays), hour: Number(a.hour), durationMinutes: Number(a.durationMinutes), category: a.category };
      case 'SEND_NOTIFICATION':
        return a.body.trim() ? { title: a.title, body: a.body } : { title: a.title };
      case 'LINK_ITEMS':
        return { goalId: a.goalId };
      case 'UPDATE_STATUS':
        return { status: a.status };
      case 'GENERATE_REPORT':
        return { period: a.period };
    }
  }

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const request = { name: name.trim(), description: description.trim() || null, triggerType: trigger, triggerConfig: triggerConfig(), actionType: action, actionConfig: actionConfig() };
      if (editing) await automationApi.updateRule(editing.id, request);
      else await automationApi.createRule(request);
      toast.success(editing ? 'Rule updated' : 'Rule created');
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save the rule.'));
    } finally {
      setSaving(false);
    }
  }

  const statusOptions = t.entityType === 'GOAL' ? GOAL_STATUSES : TASK_STATUSES;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit rule' : 'New rule'}</DialogTitle>
        </DialogHeader>

        <Field label="Name">
          <Input value={name} maxLength={200} onChange={(e) => setName(e.target.value)} placeholder="Follow up after applying" aria-label="Rule name" />
        </Field>
        <Field label="Description">
          <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} aria-label="Description" />
        </Field>

        <div className="rounded-md border p-3">
          <p className="mb-3 text-xs font-semibold tracking-widest text-muted-foreground uppercase">When</p>
          <div className="flex flex-col gap-3">
            <Field label="Trigger" hint={TRIGGER_TYPES.find((x) => x.value === trigger)?.hint}>
              <Pick value={trigger} onChange={(v) => setTrigger(v as TriggerType)} options={TRIGGER_TYPES} label="Trigger" />
            </Field>

            {isEvent && (
              <>
                <Field label="Item type">
                  <Pick value={t.entityType} onChange={(v) => setTv('entityType', v)} options={trigger === 'ON_COMPLETE' ? ENTITY_TYPES.filter((e) => e.value !== 'JOB_APPLICATION') : ENTITY_TYPES} label="Item type" />
                </Field>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Field label="Status is (optional)">
                    <Input value={t.status} onChange={(e) => setTv('status', e.target.value)} placeholder="APPLIED" aria-label="Status is" />
                  </Field>
                  <Field label="Priority is (optional)">
                    <Input value={t.priority} onChange={(e) => setTv('priority', e.target.value)} placeholder="URGENT" aria-label="Priority is" />
                  </Field>
                  <Field label="Title contains (optional)">
                    <Input value={t.titleContains} onChange={(e) => setTv('titleContains', e.target.value)} aria-label="Title contains" />
                  </Field>
                </div>
              </>
            )}

            {trigger === 'SCHEDULED' && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label="Repeats">
                  <Pick value={t.frequency} onChange={(v) => setTv('frequency', v)} options={plain(['DAILY', 'WEEKLY', 'MONTHLY'])} label="Repeats" />
                </Field>
                {t.frequency === 'WEEKLY' && (
                  <Field label="Day">
                    <Pick value={t.dayOfWeek} onChange={(v) => setTv('dayOfWeek', v)} options={DAYS} label="Day of week" />
                  </Field>
                )}
                {t.frequency === 'MONTHLY' && (
                  <Field label="Day of month">
                    <Input type="number" min={1} max={31} value={t.dayOfMonth} onChange={(e) => setTv('dayOfMonth', e.target.value)} aria-label="Day of month" />
                  </Field>
                )}
                <Field label="At">
                  <Input type="time" value={t.time} onChange={(e) => setTv('time', e.target.value)} aria-label="Time" />
                </Field>
              </div>
            )}

            {trigger === 'THRESHOLD' && (
              <>
                <Field label="Condition">
                  <Pick value={t.metric} onChange={(v) => setTv('metric', v)} options={THRESHOLD_METRICS} label="Condition" />
                </Field>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label={`Value (${THRESHOLD_METRICS.find((m) => m.value === t.metric)?.unit})`}>
                    <Input type="number" min={0} value={t.value} onChange={(e) => setTv('value', e.target.value)} aria-label="Value" />
                  </Field>
                  {t.metric === 'GOAL_PROGRESS_BELOW' && (
                    <Field label="Only this goal (optional)">
                      <SearchableSelect options={goalOptions} value={t.goalId || null} onChange={(id) => setTv('goalId', id ?? '')} placeholder="Any goal" />
                    </Field>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Fires once when the condition becomes true, then again only after it has cleared and returned.</p>
              </>
            )}
          </div>
        </div>

        <div className="rounded-md border p-3">
          <p className="mb-3 text-xs font-semibold tracking-widest text-muted-foreground uppercase">Then</p>
          <div className="flex flex-col gap-3">
            <Field label="Action">
              <Pick value={action} onChange={(v) => setAction(v as ActionType)} options={ACTION_TYPES} label="Action" />
            </Field>

            {(action === 'CREATE_TASK' || action === 'CREATE_EVENT' || action === 'SEND_NOTIFICATION') && (
              <Field label="Title" hint={isEvent ? 'Use {{title}} for the item’s title, e.g. “Follow up: {{title}}”.' : undefined}>
                <Input value={a.title} onChange={(e) => setAv('title', e.target.value)} aria-label="Action title" />
              </Field>
            )}
            {action === 'SEND_NOTIFICATION' && (
              <Field label="Message (optional)">
                <Textarea rows={2} value={a.body} onChange={(e) => setAv('body', e.target.value)} aria-label="Message" />
              </Field>
            )}
            {action === 'CREATE_TASK' && (
              <>
                <Field label="Description (optional)">
                  <Textarea rows={2} value={a.description} onChange={(e) => setAv('description', e.target.value)} aria-label="Task description" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Priority">
                    <Pick value={a.priority} onChange={(v) => setAv('priority', v)} options={plain(PRIORITIES)} label="Priority" />
                  </Field>
                  <Field label="Due in (days)">
                    <Input type="number" min={0} max={365} value={a.dueInDays} onChange={(e) => setAv('dueInDays', e.target.value)} aria-label="Due in days" />
                  </Field>
                </div>
                <Field label="Link to goal (optional)">
                  <SearchableSelect options={goalOptions} value={a.goalId || null} onChange={(id) => setAv('goalId', id ?? '')} placeholder="No goal" />
                </Field>
              </>
            )}
            {action === 'CREATE_EVENT' && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Field label="Starts in (days)">
                  <Input type="number" min={0} value={a.startInDays} onChange={(e) => setAv('startInDays', e.target.value)} aria-label="Starts in days" />
                </Field>
                <Field label="Hour (0-23)">
                  <Input type="number" min={0} max={23} value={a.hour} onChange={(e) => setAv('hour', e.target.value)} aria-label="Hour" />
                </Field>
                <Field label="Minutes">
                  <Input type="number" min={5} value={a.durationMinutes} onChange={(e) => setAv('durationMinutes', e.target.value)} aria-label="Duration minutes" />
                </Field>
                <Field label="Category">
                  <Pick value={a.category} onChange={(v) => setAv('category', v)} options={plain(EVENT_CATEGORIES)} label="Category" />
                </Field>
              </div>
            )}
            {action === 'LINK_ITEMS' && (
              <Field label="Goal" hint="Needs a task trigger - the task that triggered the rule is linked to this goal.">
                <SearchableSelect options={goalOptions} value={a.goalId || null} onChange={(id) => setAv('goalId', id ?? '')} placeholder="Choose a goal…" />
              </Field>
            )}
            {action === 'UPDATE_STATUS' && (
              <Field label="Set status to" hint="Needs a task or goal trigger.">
                <Pick value={a.status} onChange={(v) => setAv('status', v)} options={plain(statusOptions)} label="Status" />
              </Field>
            )}
            {action === 'GENERATE_REPORT' && (
              <Field label="Report">
                <Pick value={a.period} onChange={(v) => setAv('period', v)} options={[{ value: 'WEEK', label: 'Weekly summary' }, { value: 'MONTH', label: 'Monthly summary' }]} label="Report" />
              </Field>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={saving || !name.trim()}>
            {saving ? 'Saving…' : 'Save rule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
