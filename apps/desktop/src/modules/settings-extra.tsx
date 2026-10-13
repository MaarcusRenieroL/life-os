import { APP_MODULE_LIST, notificationTarget } from '@life-os/core';
import { useState } from 'react';

import { useNav } from '../lib/nav';
import { openExternal } from '../lib/runtime';
import { useApi, useSession } from '../lib/session';
import { useAsync, useRunner } from '../lib/use-async';
import { NotificationList } from './notifications';
import { Empty, ErrorNote, Field, Panel } from '../ui';

export function ProfileTab() {
  const api = useApi();
  const { signOut } = useSession();
  const runner = useRunner();
  const me = useAsync(() => api.account.me(), [api]);
  const sessions = useAsync(() => api.account.sessions(), [api]);
  const [name, setName] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const active = sessions.data?.filter((x) => !x.revokedAt) ?? [];
  return (
    <div className="stack">
      {runner.error && <ErrorNote message={runner.error} />}
      <Panel title="Profile">
        <form className="stack" onSubmit={(e) => { e.preventDefault(); void runner.run(() => api.account.updateName(name!.trim()), async () => { setName(null); await me.reload(); }); }}>
          <p className="muted">{me.data?.email}</p>
          <Field label="Name"><input value={name ?? me.data?.name ?? ''} onChange={(e) => setName(e.target.value)} /></Field>
          <div className="actions"><button className="primary" disabled={name === null || !name.trim() || runner.busy}>Save name</button></div>
        </form>
      </Panel>
      <Panel title="Signed-in devices">
        {active.length === 0 ? <Empty>No other devices.</Empty> : (
          <ul className="list">
            {active.map((x) => <li key={x.id}><span className="grow"><b>{x.deviceName}</b><div className="muted">{x.deviceType} · last active {x.lastActiveAt.slice(0, 16).replace('T', ' ')}</div></span><button className="ghost" onClick={() => void runner.run(() => api.account.revokeSession(x.id), sessions.reload)}>Sign out</button></li>)}
          </ul>
        )}
      </Panel>
      <Panel title="Danger zone">
        <p className="muted">Deleting your account removes everything: tasks, notes, finance, the vault. It cannot be undone.</p>
        {deleting ? (
          <form className="stack" onSubmit={(e) => { e.preventDefault(); void runner.run(async () => { await api.account.verifyPassword(password); await api.account.deleteAccount(password); await signOut(); }); }}>
            <Field label="Enter your password to confirm"><input type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
            <div className="actions"><button type="button" className="ghost" onClick={() => { setDeleting(false); setPassword(''); }}>Cancel</button><button className="danger" disabled={!password || runner.busy}>Delete forever</button></div>
          </form>
        ) : <div className="actions"><button className="danger" onClick={() => setDeleting(true)}>Delete my account</button></div>}
      </Panel>
    </div>
  );
}

export function ModulesTab() {
  const api = useApi();
  const runner = useRunner();
  const modules = useAsync(() => api.core.modules(), [api]);
  const overrides = new Map((modules.data ?? []).map((m) => [m.moduleCode, m.enabled]));
  return (
    <div className="stack">
      {runner.error && <ErrorNote message={runner.error} />}
      <Panel title="Modules">
        <p className="muted">Switch off what you do not use. Its pages disappear from the menu and the web app.</p>
        <ul className="list">
          {APP_MODULE_LIST.map((m) => (
            <li key={m.code}>
              <span className="grow">{m.name}</span>
              <input type="checkbox" style={{ width: 'auto' }} checked={overrides.has(m.code) ? overrides.get(m.code)! : m.enabled} onChange={(e) => void runner.run(() => api.core.setModule(m.code, e.target.checked), modules.reload)} aria-label={m.name} />
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

export function IntegrationsTab() {
  const api = useApi();
  const runner = useRunner();
  const status = useAsync(() => api.financeTools.gmailStatus(), [api]);
  const boxes = status.data?.mailboxes ?? [];
  const purposes = [
    { purpose: 'FINANCE' as const, label: 'Bank alerts', hint: 'Reads bills, bank and booking mail. Never one-time codes.' },
    { purpose: 'JOBS' as const, label: 'Job mail', hint: 'Reads application and interview mail for the Job Tracker only.' },
  ];
  return (
    <div className="stack">
      {runner.error && <ErrorNote message={runner.error} />}
      <Panel title="Gmail">
        <ul className="list">
          {purposes.map((p) => {
            const box = boxes.find((b) => b.purpose === p.purpose);
            return (
              <li key={p.purpose}>
                <span className="grow"><b>{p.label}</b><div className="muted">{p.hint}</div>{box && <small className="muted">{box.email ?? 'Gmail'}{box.lastRefreshedAt ? ` · checked ${box.lastRefreshedAt.slice(0, 16).replace('T', ' ')}` : ''}</small>}</span>
                <span className={`pill ${box ? 'good' : ''}`}>{box ? 'Connected' : 'Not connected'}</span>
                <button className="ghost" onClick={() => void runner.run(async () => { await openExternal(await api.financeTools.gmailConnectUrl(p.purpose)); }, status.reload)}>{box ? 'Use a different account' : 'Connect Gmail'}</button>
              </li>
            );
          })}
        </ul>
        <p className="muted">Google asks you to approve access in your browser. Come back here when it says connected.</p>
      </Panel>
    </div>
  );
}

export function NotificationsTab() {
  const go = useNav();
  return <NotificationList onOpen={(n) => { const t = notificationTarget(n); go(t.screen, { tab: t.tab, entity: t.entity }); }} />;
}

/** What is left to set up in each module, worked out from what already exists. */
export function SetupTab() {
  const api = useApi();
  const go = useNav();
  const probes = useAsync(async () => {
    const safe = async <T,>(f: () => Promise<T>, fallback: T) => { try { return await f(); } catch { return fallback; } };
    const [accounts, gmail, tasks, habits, goals, events, notes, routines, vault, profile] = await Promise.all([
      safe(() => api.finance.accounts(), []), safe(() => api.financeTools.gmailStatus(), null), safe(() => api.tasks.list({}), []), safe(() => api.habits.list(), []), safe(() => api.goals.list(), []),
      safe(() => api.calendar.list('2000-01-01', '2100-01-01'), []), safe(() => api.notes.recent(1), []), safe(() => api.workouts.routines(), []), safe(() => api.vault.status(), null), safe(() => api.jobTools.profile(), null),
    ]);
    return [
      { name: 'Finance', id: 'finance', steps: [{ t: 'Add your accounts', done: accounts.length > 0 }, { t: 'Connect Gmail for bank alerts', done: !!gmail?.connected }] },
      { name: 'Tasks', id: 'tasks', steps: [{ t: 'Add your first task', done: tasks.length > 0 }] },
      { name: 'Habits', id: 'habits', steps: [{ t: 'Create your first habit', done: habits.length > 0 }] },
      { name: 'Goals', id: 'goals', steps: [{ t: 'Set a goal', done: goals.length > 0 }] },
      { name: 'Calendar', id: 'calendar', steps: [{ t: 'Add an event', done: events.length > 0 }] },
      { name: 'Notes', id: 'notes', steps: [{ t: 'Write your first note', done: notes.length > 0 }] },
      { name: 'Workouts', id: 'workouts', steps: [{ t: 'Pick a routine', done: routines.length > 0 }] },
      { name: 'Password Manager', id: 'vault', steps: [{ t: 'Create your master password', done: !!vault?.hasMasterPassword }] },
      { name: 'Job Tracker', id: 'jobs', steps: [{ t: 'Fill in your career profile', done: !!profile?.onboarded }] },
    ];
  }, [api]);
  return (
    <div className="stack">
      {probes.error && !probes.data && <ErrorNote message={probes.error} onRetry={probes.reload} />}
      <div className="grid">
        {probes.data?.map((m) => (
          <Panel key={m.name} title={`${m.name} · ${m.steps.filter((x) => x.done).length}/${m.steps.length}`} action={<button className="link" onClick={() => go(m.id)}>Open</button>}>
            <ul className="list">{m.steps.map((st) => <li key={st.t}><span className={`pill ${st.done ? 'good' : 'warn'}`}>{st.done ? 'done' : 'to do'}</span><span className="grow">{st.t}</span></li>)}</ul>
          </Panel>
        ))}
      </div>
    </div>
  );
}
