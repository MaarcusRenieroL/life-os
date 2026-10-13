import { ACTION_TYPES, describeAction, describeTrigger, ENTITY_TYPES, RULE_EVENT_CATEGORIES, ruleFormFrom, ruleRequestFrom, THRESHOLD_METRICS, TRIGGER_TYPES, WEEK_DAYS, type AutomationExecution, type AutomationRule } from '@life-os/core';
import { useState, type FormEvent } from 'react';

import { useApi } from '../lib/session';
import { useAsync, useRunner } from '../lib/use-async';
import { DataGrid, type Col } from '../grid/data-grid';
import { ErrorNote, Field, Modal, opts, Panel, Select } from '../ui';

const plain = (values: readonly string[]) => values.map((v) => ({ value: v, label: v.replace('_', ' ').toLowerCase() }));
const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED'];
const GOAL_STATUSES = ['ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED'];
const PRIORITIES = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];

export function RulesTab() {
  const api = useApi();
  const runner = useRunner();
  const rules = useAsync(() => api.automation.rules(), [api]);
  const [editing, setEditing] = useState<AutomationRule | 'new' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const columns: Col<AutomationRule>[] = [
    { id: 'name', title: 'Rule', value: (r) => r.name, filter: { type: 'text' }, cell: (r) => <b>{r.name}</b> },
    { id: 'trigger', title: 'When', value: (r) => describeTrigger(r.triggerType, r.triggerConfig), filter: { type: 'text' } },
    { id: 'action', title: 'Then', value: (r) => describeAction(r.actionType, r.actionConfig), filter: { type: 'text' } },
    { id: 'status', title: 'Status', value: (r) => (r.enabled ? 'On' : 'Off'), filter: { type: 'select' } },
    { id: 'runs', title: 'Runs', value: (r) => r.runCount, align: 'right', aggregate: 'sum', filter: { type: 'number' } },
    { id: 'last', title: 'Last run', value: (r) => (r.lastRunAt ?? '').slice(0, 16).replace('T', ' '), filter: { type: 'date' } },
    { id: 'created', title: 'Created', value: (r) => r.createdAt.slice(0, 10), filter: { type: 'date' }, hidden: true },
  ];
  return (
    <>
      {rules.error && !rules.data && <ErrorNote message={rules.error} onRetry={rules.reload} />}
      {runner.error && <ErrorNote message={runner.error} />}
      {message && <p className="muted">{message}</p>}
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
        views={[{ id: 'on', name: 'On', filters: { status: ['On'] } }, { id: 'off', name: 'Off', filters: { status: ['Off'] } }]}
        toolbarEnd={<button className="primary g-btn" onClick={() => setEditing('new')}>+ New rule</button>}
        rowActions={(r) => (
          <>
            <label className="muted"><input type="checkbox" checked={r.enabled} onChange={(e) => void runner.run(() => api.automation.setEnabled(r.id, e.target.checked), rules.reload)} /> On</label>
            <button className="ghost g-btn" title="Run once now" onClick={() => void runner.run(async () => { const run = await api.automation.testRule(r.id); setMessage(run.message ?? (run.status === 'SUCCESS' ? 'Test run succeeded' : 'Test run failed')); }, rules.reload)}>Test</button>
          </>
        )}
      />
      {editing && <RuleModal rule={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await rules.reload(); }} />}
    </>
  );
}

function RuleModal({ rule, onClose, onSaved }: { rule: AutomationRule | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const api = useApi();
  const runner = useRunner();
  const [f, setF] = useState(() => ruleFormFrom(rule));
  const goals = useAsync(() => api.goals.list(), [api]);
  const setT = (k: string, v: string) => setF({ ...f, t: { ...f.t, [k]: v } });
  const setA = (k: string, v: string) => setF({ ...f, a: { ...f.a, [k]: v } });
  const isEvent = f.trigger === 'ON_CREATE' || f.trigger === 'ON_COMPLETE' || f.trigger === 'ON_UPDATE';
  const goalOptions = (goals.data ?? []).map((g) => ({ value: g.id, label: g.name }));

  async function save(event: FormEvent) {
    event.preventDefault();
    const request = ruleRequestFrom(f);
    if (await runner.run(() => (rule ? api.automation.updateRule(rule.id, request) : api.automation.createRule(request)))) await onSaved();
  }

  return (
    <Modal title={rule ? 'Edit rule' : 'New rule'} onClose={onClose} wide>
      <form className="stack" onSubmit={save}>
        <Field label="Name"><input autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Follow up after applying" /></Field>
        <Field label="Description"><input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>

        <Field label="When"><Select value={f.trigger} onChange={(v) => v && setF({ ...f, trigger: v })} options={TRIGGER_TYPES.map((t) => ({ value: t.value, label: t.label }))} /></Field>
        {isEvent && (
          <div className="cols">
            <Field label="What"><Select value={f.t.entityType} onChange={(v) => v && setT('entityType', v)} options={ENTITY_TYPES} /></Field>
            <Field label="Only if status is"><Select value={f.t.status} onChange={(v) => setT('status', v)} options={plain(f.t.entityType === 'GOAL' ? GOAL_STATUSES : TASK_STATUSES)} placeholder="Any" /></Field>
            <Field label="Only if priority is"><Select value={f.t.priority} onChange={(v) => setT('priority', v)} options={plain(PRIORITIES)} placeholder="Any" /></Field>
            <Field label="Only if the title contains"><input value={f.t.titleContains} onChange={(e) => setT('titleContains', e.target.value)} /></Field>
          </div>
        )}
        {f.trigger === 'SCHEDULED' && (
          <div className="cols">
            <Field label="How often"><Select value={f.t.frequency} onChange={(v) => v && setT('frequency', v)} options={opts(['DAILY', 'WEEKLY', 'MONTHLY'] as const)} /></Field>
            <Field label="At"><input type="time" value={f.t.time} onChange={(e) => setT('time', e.target.value)} /></Field>
            {f.t.frequency === 'WEEKLY' && <Field label="Day"><Select value={f.t.dayOfWeek} onChange={(v) => v && setT('dayOfWeek', v)} options={WEEK_DAYS.slice(1).map((d, i) => ({ value: String(i + 1), label: d }))} /></Field>}
            {f.t.frequency === 'MONTHLY' && <Field label="Day of month"><input type="number" min={1} max={28} value={f.t.dayOfMonth} onChange={(e) => setT('dayOfMonth', e.target.value)} /></Field>}
          </div>
        )}
        {f.trigger === 'THRESHOLD' && (
          <div className="cols">
            <Field label="Metric"><Select value={f.t.metric} onChange={(v) => v && setT('metric', v)} options={THRESHOLD_METRICS.map((m) => ({ value: m.value, label: m.label }))} /></Field>
            <Field label="Value"><input type="number" value={f.t.value} onChange={(e) => setT('value', e.target.value)} /></Field>
            {f.t.metric === 'GOAL_PROGRESS_BELOW' && <Field label="Goal (optional)"><Select value={f.t.goalId} onChange={(v) => setT('goalId', v)} options={goalOptions} placeholder="Any goal" /></Field>}
          </div>
        )}

        <Field label="Then"><Select value={f.action} onChange={(v) => v && setF({ ...f, action: v })} options={ACTION_TYPES.map((a) => ({ value: a.value, label: a.label }))} /></Field>
        {f.action === 'CREATE_TASK' && (
          <div className="cols">
            <Field label="Task title"><input value={f.a.title} onChange={(e) => setA('title', e.target.value)} /></Field>
            <Field label="Priority"><Select value={f.a.priority} onChange={(v) => v && setA('priority', v)} options={plain(PRIORITIES)} /></Field>
            <Field label="Due in (days)"><input type="number" value={f.a.dueInDays} onChange={(e) => setA('dueInDays', e.target.value)} /></Field>
            <Field label="Link to goal"><Select value={f.a.goalId} onChange={(v) => setA('goalId', v)} options={goalOptions} placeholder="None" /></Field>
          </div>
        )}
        {f.action === 'CREATE_EVENT' && (
          <div className="cols">
            <Field label="Event title"><input value={f.a.title} onChange={(e) => setA('title', e.target.value)} /></Field>
            <Field label="Starts in (days)"><input type="number" value={f.a.startInDays} onChange={(e) => setA('startInDays', e.target.value)} /></Field>
            <Field label="Hour (0-23)"><input type="number" value={f.a.hour} onChange={(e) => setA('hour', e.target.value)} /></Field>
            <Field label="Minutes"><input type="number" value={f.a.durationMinutes} onChange={(e) => setA('durationMinutes', e.target.value)} /></Field>
            <Field label="Category"><Select value={f.a.category} onChange={(v) => v && setA('category', v)} options={plain(RULE_EVENT_CATEGORIES)} /></Field>
          </div>
        )}
        {f.action === 'SEND_NOTIFICATION' && (
          <div className="cols">
            <Field label="Title"><input value={f.a.title} onChange={(e) => setA('title', e.target.value)} /></Field>
            <Field label="Message (optional)"><input value={f.a.body} onChange={(e) => setA('body', e.target.value)} /></Field>
          </div>
        )}
        {f.action === 'LINK_ITEMS' && <Field label="Goal"><Select value={f.a.goalId} onChange={(v) => setA('goalId', v)} options={goalOptions} placeholder="Pick a goal" /></Field>}
        {f.action === 'UPDATE_STATUS' && <Field label="Set status to"><Select value={f.a.status} onChange={(v) => v && setA('status', v)} options={plain(TASK_STATUSES)} /></Field>}
        {f.action === 'GENERATE_REPORT' && <Field label="Report"><Select value={f.a.period} onChange={(v) => v && setA('period', v)} options={opts(['WEEK', 'MONTH'] as const)} /></Field>}

        {runner.error && <ErrorNote message={runner.error} />}
        <div className="actions">
          {rule && <button type="button" className="danger" onClick={() => void runner.run(() => api.automation.deleteRule(rule.id), onSaved)}>Delete</button>}
          <button className="primary" disabled={!f.name.trim() || runner.busy}>{rule ? 'Save' : 'Create rule'}</button>
        </div>
      </form>
    </Modal>
  );
}

export function TemplatesTab() {
  const api = useApi();
  const runner = useRunner();
  const templates = useAsync(() => api.automation.templates(), [api]);
  const rules = useAsync(() => api.automation.rules(), [api]);
  const added = new Set((rules.data ?? []).map((r) => r.templateKey).filter(Boolean));
  return (
    <>
      {templates.error && !templates.data && <ErrorNote message={templates.error} onRetry={templates.reload} />}
      {runner.error && <ErrorNote message={runner.error} />}
      <Panel title="Templates">
        <ul className="list">
          {templates.data?.map((t) => (
            <li key={t.key}>
              <span className="grow"><b>{t.name}</b><div className="muted">{t.description}</div><small className="muted">{describeTrigger(t.triggerType, t.triggerConfig)} → {describeAction(t.actionType, t.actionConfig)}</small></span>
              {added.has(t.key) ? <span className="pill good">Added</span> : <button className="primary" onClick={() => void runner.run(() => api.automation.applyTemplate(t.key), rules.reload)}>Add rule</button>}
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}

export function HistoryTab() {
  const api = useApi();
  const [ruleId, setRuleId] = useState('');
  const rules = useAsync(() => api.automation.rules(), [api]);
  const runs = useAsync(() => api.automation.executions(ruleId || undefined, 80), [api, ruleId]);
  const names = new Map((rules.data ?? []).map((r) => [r.id, r.name]));
  const columns: Col<AutomationExecution>[] = [
    { id: 'when', title: 'When', value: (r) => r.executedAt.slice(0, 16).replace('T', ' '), filter: { type: 'date' } },
    { id: 'rule', title: 'Rule', value: (r) => names.get(r.ruleId) ?? 'Deleted rule', filter: { type: 'select' }, cell: (r) => <b>{names.get(r.ruleId) ?? 'Deleted rule'}</b> },
    { id: 'result', title: 'Result', value: (r) => (r.status === 'SUCCESS' ? 'Succeeded' : 'Failed'), filter: { type: 'select' } },
    { id: 'message', title: 'Message', value: (r) => r.message ?? '' },
    { id: 'trigger', title: 'Trigger', value: (r) => r.triggerSummary ?? '' },
  ];
  return (
    <>
      <div className="row"><Select value={ruleId} onChange={setRuleId} options={(rules.data ?? []).map((r) => ({ value: r.id, label: r.name }))} placeholder="All rules" /></div>
      {runs.error && !runs.data && <ErrorNote message={runs.error} onRetry={runs.reload} />}
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
