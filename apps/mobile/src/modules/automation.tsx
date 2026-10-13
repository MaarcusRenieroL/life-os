import { ACTION_TYPES, describeAction, describeTrigger, ENTITY_TYPES, RULE_EVENT_CATEGORIES, ruleFormFrom, ruleRequestFrom, THRESHOLD_METRICS, TRIGGER_TYPES, WEEK_DAYS, type AutomationExecution, type AutomationRule } from '@life-os/core';
import { useState } from 'react';
import { Switch, View } from 'react-native';
import { Text } from '@/text';

import { DataGrid, type Col } from '@/grid/data-grid';
import { Btn, Chips, Field, Input, opts, Pill, Row, Sheet } from '@/kit';
import { useApi } from '@/lib/session';
import { useAsync, useRunner } from '@/lib/use-async';
import { C } from '@/theme';
import { ErrorNote, Muted, Panel, s } from '@/ui';

const plain = (values: readonly string[]) => values.map((v) => ({ value: v, label: v.replace('_', ' ').toLowerCase() }));
const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED'];
const GOAL_STATUSES = ['ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED'];
const PRIORITIES = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];

/** Your automation rules: what triggers each, what it does, whether it is on. */
export function RulesTab() {
  const api = useApi();
  const runner = useRunner();
  const rules = useAsync(() => api.automation.rules(), api);
  const [editing, setEditing] = useState<AutomationRule | 'new' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const columns: Col<AutomationRule>[] = [
    { id: 'name', title: 'Rule', value: (r) => r.name, filter: { type: 'text' }, cell: (r) => <Text style={{ color: C.text, fontSize: 15, fontWeight: '700', flexShrink: 1 }}>{r.name}</Text> },
    { id: 'trigger', title: 'When', value: (r) => describeTrigger(r.triggerType, r.triggerConfig), filter: { type: 'text' } },
    { id: 'action', title: 'Then', value: (r) => describeAction(r.actionType, r.actionConfig), filter: { type: 'text' } },
    { id: 'status', title: 'Status', value: (r) => (r.enabled ? 'On' : 'Off'), filter: { type: 'select' } },
    { id: 'runs', title: 'Runs', value: (r) => r.runCount, align: 'right', aggregate: 'sum', filter: { type: 'number' } },
    { id: 'last', title: 'Last run', value: (r) => (r.lastRunAt ?? '').slice(0, 16).replace('T', ' '), filter: { type: 'date' } },
    { id: 'created', title: 'Created', value: (r) => r.createdAt.slice(0, 10), filter: { type: 'date' }, hidden: true },
  ];

  return (
    <>
      <Btn label="+ New rule" onPress={() => setEditing('new')} style={{ marginBottom: 12 }} />
      {rules.error && !rules.data ? <ErrorNote message={rules.error} onRetry={rules.reload} /> : null}
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      {message ? <Muted style={{ marginBottom: 8 }}>{message}</Muted> : null}
      <DataGrid
        tableId="automation.rules"
        data={rules.data ?? []}
        columns={columns}
        getRowId={(r) => r.id}
        loading={rules.loading && !rules.data}
        initialSorting={[{ id: 'name', desc: false }]}
        emptyMessage="No rules yet. Start from a template."
        searchPlaceholder="Search rules…"
        exportName="automation-rules"
        onRowClick={setEditing}
        drawer={false}
        dim={(r) => !r.enabled}
        views={[{ id: 'on', name: 'On', filters: { status: ['On'] } }, { id: 'off', name: 'Off', filters: { status: ['Off'] } }]}
        trailing={(r) => <Switch value={r.enabled} onValueChange={(v) => void runner.run(() => api.automation.setEnabled(r.id, v), rules.reload)} trackColor={{ true: C.accent }} />}
      />
      {editing ? (
        <RuleSheet
          rule={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await rules.reload(); }}
          onTest={async (rule) => { const run = await api.automation.testRule(rule.id); setMessage(run.message ?? (run.status === 'SUCCESS' ? 'Test run succeeded' : 'Test run failed')); await rules.reload(); }}
        />
      ) : null}
    </>
  );
}

function RuleSheet({ rule, onClose, onSaved, onTest }: { rule: AutomationRule | null; onClose: () => void; onSaved: () => Promise<void>; onTest: (rule: AutomationRule) => Promise<void> }) {
  const api = useApi();
  const runner = useRunner();
  const [f, setF] = useState(() => ruleFormFrom(rule));
  const goals = useAsync(() => api.goals.list(), api);
  const setT = (k: string, v: string) => setF({ ...f, t: { ...f.t, [k]: v } });
  const setA = (k: string, v: string) => setF({ ...f, a: { ...f.a, [k]: v } });
  const isEvent = f.trigger === 'ON_CREATE' || f.trigger === 'ON_COMPLETE' || f.trigger === 'ON_UPDATE';
  const goalOptions = (goals.data ?? []).map((g) => ({ value: g.id, label: g.name }));

  async function save() {
    const request = ruleRequestFrom(f);
    if (await runner.run(() => (rule ? api.automation.updateRule(rule.id, request) : api.automation.createRule(request)))) await onSaved();
  }

  return (
    <Sheet title={rule ? 'Edit rule' : 'New rule'} onClose={onClose}>
      <Field label="Name"><Input value={f.name} onChangeText={(v) => setF({ ...f, name: v })} placeholder="Follow up after applying" /></Field>
      <Field label="Description"><Input value={f.description} onChangeText={(v) => setF({ ...f, description: v })} /></Field>

      <Field label="When"><Chips value={f.trigger} onChange={(v) => v && setF({ ...f, trigger: v })} options={TRIGGER_TYPES.map((t) => ({ value: t.value, label: t.label.replace('When ', '').replace('On a ', '') }))} /></Field>
      {isEvent ? (
        <>
          <Field label="What"><Chips value={f.t.entityType} onChange={(v) => v && setT('entityType', v)} options={ENTITY_TYPES} /></Field>
          <Field label="Only if status is"><Chips value={f.t.status} onChange={(v) => setT('status', v)} options={plain(f.t.entityType === 'GOAL' ? GOAL_STATUSES : TASK_STATUSES)} clearable /></Field>
          <Field label="Only if priority is"><Chips value={f.t.priority} onChange={(v) => setT('priority', v)} options={plain(PRIORITIES)} clearable /></Field>
          <Field label="Only if the title contains"><Input value={f.t.titleContains} onChangeText={(v) => setT('titleContains', v)} autoCapitalize="none" /></Field>
        </>
      ) : null}
      {f.trigger === 'SCHEDULED' ? (
        <>
          <Field label="How often"><Chips value={f.t.frequency} onChange={(v) => v && setT('frequency', v)} options={opts(['DAILY', 'WEEKLY', 'MONTHLY'] as const)} /></Field>
          <Field label="At (HH:MM)"><Input value={f.t.time} onChangeText={(v) => setT('time', v)} /></Field>
          {f.t.frequency === 'WEEKLY' ? <Field label="Day"><Chips value={f.t.dayOfWeek} onChange={(v) => v && setT('dayOfWeek', v)} options={WEEK_DAYS.slice(1).map((d, i) => ({ value: String(i + 1), label: d.slice(0, 3) }))} /></Field> : null}
          {f.t.frequency === 'MONTHLY' ? <Field label="Day of month"><Input value={f.t.dayOfMonth} onChangeText={(v) => setT('dayOfMonth', v)} keyboardType="numeric" /></Field> : null}
        </>
      ) : null}
      {f.trigger === 'THRESHOLD' ? (
        <>
          <Field label="Metric"><Chips value={f.t.metric} onChange={(v) => v && setT('metric', v)} options={THRESHOLD_METRICS.map((m) => ({ value: m.value, label: m.label }))} /></Field>
          <Field label="Value"><Input value={f.t.value} onChangeText={(v) => setT('value', v)} keyboardType="numeric" /></Field>
          {f.t.metric === 'GOAL_PROGRESS_BELOW' ? <Field label="Goal (optional)"><Chips value={f.t.goalId} onChange={(v) => setT('goalId', v)} options={goalOptions} clearable /></Field> : null}
        </>
      ) : null}

      <Field label="Then"><Chips value={f.action} onChange={(v) => v && setF({ ...f, action: v })} options={ACTION_TYPES.map((a) => ({ value: a.value, label: a.label }))} /></Field>
      {f.action === 'CREATE_TASK' ? (
        <>
          <Field label="Task title"><Input value={f.a.title} onChangeText={(v) => setA('title', v)} /></Field>
          <Field label="Priority"><Chips value={f.a.priority} onChange={(v) => v && setA('priority', v)} options={plain(PRIORITIES)} /></Field>
          <Field label="Due in (days)"><Input value={f.a.dueInDays} onChangeText={(v) => setA('dueInDays', v)} keyboardType="numeric" /></Field>
          <Field label="Link to goal (optional)"><Chips value={f.a.goalId} onChange={(v) => setA('goalId', v)} options={goalOptions} clearable /></Field>
        </>
      ) : null}
      {f.action === 'CREATE_EVENT' ? (
        <>
          <Field label="Event title"><Input value={f.a.title} onChangeText={(v) => setA('title', v)} /></Field>
          <Field label="Starts in (days)"><Input value={f.a.startInDays} onChangeText={(v) => setA('startInDays', v)} keyboardType="numeric" /></Field>
          <Field label="Hour (0-23)"><Input value={f.a.hour} onChangeText={(v) => setA('hour', v)} keyboardType="numeric" /></Field>
          <Field label="Minutes"><Input value={f.a.durationMinutes} onChangeText={(v) => setA('durationMinutes', v)} keyboardType="numeric" /></Field>
          <Field label="Category"><Chips value={f.a.category} onChange={(v) => v && setA('category', v)} options={plain(RULE_EVENT_CATEGORIES)} /></Field>
        </>
      ) : null}
      {f.action === 'SEND_NOTIFICATION' ? (
        <>
          <Field label="Title"><Input value={f.a.title} onChangeText={(v) => setA('title', v)} /></Field>
          <Field label="Message (optional)"><Input value={f.a.body} onChangeText={(v) => setA('body', v)} /></Field>
        </>
      ) : null}
      {f.action === 'LINK_ITEMS' ? <Field label="Goal"><Chips value={f.a.goalId} onChange={(v) => setA('goalId', v)} options={goalOptions} /></Field> : null}
      {f.action === 'UPDATE_STATUS' ? <Field label="Set status to"><Chips value={f.a.status} onChange={(v) => v && setA('status', v)} options={plain(TASK_STATUSES)} /></Field> : null}
      {f.action === 'GENERATE_REPORT' ? <Field label="Report"><Chips value={f.a.period} onChange={(v) => v && setA('period', v)} options={opts(['WEEK', 'MONTH'] as const)} /></Field> : null}

      {runner.error ? <ErrorNote message={runner.error} /> : null}
      <View style={{ gap: 10 }}>
        <Btn label={rule ? 'Save' : 'Create rule'} disabled={!f.name.trim() || runner.busy} onPress={() => void save()} />
        {rule ? <Btn kind="ghost" label="Run once now" onPress={() => void runner.run(() => onTest(rule))} /> : null}
        {rule ? <Btn kind="danger" label="Delete" onPress={() => void runner.run(() => api.automation.deleteRule(rule.id), onSaved)} /> : null}
      </View>
    </Sheet>
  );
}

/** Ready-made rules you can add in one tap. */
export function TemplatesTab() {
  const api = useApi();
  const runner = useRunner();
  const templates = useAsync(() => api.automation.templates(), api);
  const rules = useAsync(() => api.automation.rules(), api);
  const added = new Set((rules.data ?? []).map((r) => r.templateKey).filter(Boolean));
  return (
    <>
      {templates.error && !templates.data ? <ErrorNote message={templates.error} onRetry={templates.reload} /> : null}
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      <Panel title="Templates">
        {templates.data?.map((t) => (
          <Row key={t.key}>
            <View style={{ flex: 1 }}>
              <Text style={[s.body, { fontWeight: '700' }]}>{t.name}</Text>
              <Muted style={{ fontSize: 12 }}>{t.description}</Muted>
              <Muted style={{ fontSize: 11 }}>{describeTrigger(t.triggerType, t.triggerConfig)} → {describeAction(t.actionType, t.actionConfig)}</Muted>
            </View>
            {added.has(t.key) ? <Pill label="Added" color={C.accent} /> : <Btn label="Add rule" onPress={() => void runner.run(() => api.automation.applyTemplate(t.key), rules.reload)} style={{ paddingVertical: 6, paddingHorizontal: 10 }} />}
          </Row>
        ))}
      </Panel>
    </>
  );
}

/** Every time a rule ran, and what it did or why it failed. */
export function HistoryTab() {
  const api = useApi();
  const [ruleId, setRuleId] = useState('');
  const rules = useAsync(() => api.automation.rules(), api);
  const runs = useAsync(() => api.automation.executions(ruleId || undefined, 60), `${ruleId}`);
  const names = new Map((rules.data ?? []).map((r) => [r.id, r.name]));
  const columns: Col<AutomationExecution>[] = [
    { id: 'rule', title: 'Rule', value: (r) => names.get(r.ruleId) ?? 'Deleted rule', filter: { type: 'select' }, cell: (r) => <Text style={{ color: C.text, fontSize: 15, fontWeight: '700' }}>{names.get(r.ruleId) ?? 'Deleted rule'}</Text> },
    { id: 'result', title: 'Result', value: (r) => (r.status === 'SUCCESS' ? 'Succeeded' : 'Failed'), filter: { type: 'select' } },
    { id: 'when', title: 'When', value: (r) => r.executedAt.slice(0, 16).replace('T', ' '), filter: { type: 'date' } },
    { id: 'message', title: 'Message', value: (r) => r.message ?? '' },
    { id: 'trigger', title: 'Trigger', value: (r) => r.triggerSummary ?? '' },
  ];
  return (
    <>
      <View style={{ marginBottom: 10 }}><Chips value={ruleId} onChange={setRuleId} options={(rules.data ?? []).map((r) => ({ value: r.id, label: r.name }))} clearable /></View>
      {runs.error && !runs.data ? <ErrorNote message={runs.error} onRetry={runs.reload} /> : null}
      <DataGrid
        tableId="automation.history"
        data={runs.data ?? []}
        columns={columns}
        getRowId={(r) => r.id}
        loading={runs.loading && !runs.data}
        initialSorting={[{ id: 'when', desc: true }]}
        emptyMessage="Nothing has run yet."
        searchPlaceholder="Search runs…"
        exportName="automation-history"
        views={[{ id: 'failed', name: 'Failed', filters: { result: ['Failed'] } }]}
      />
    </>
  );
}
