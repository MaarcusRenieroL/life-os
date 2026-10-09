import { APP_MODULE_LIST } from '@life-os/core';
import { useRouter, type Href } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Switch, View } from 'react-native';
import { Text } from '@/text';

import { Btn, Empty, Field, Input, Pill, Row } from '@/kit';
import { useApi, useSession } from '@/lib/session';
import { useAsync, useRunner } from '@/lib/use-async';
import { NotificationList } from '@/notifications';
import { C } from '@/theme';
import { ErrorNote, Muted, Panel, s } from '@/ui';

export function ProfileTab() {
  const api = useApi();
  const { signOut } = useSession();
  const runner = useRunner();
  const me = useAsync(() => api.account.me(), api);
  const sessions = useAsync(() => api.account.sessions(), api);
  const [name, setName] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const active = sessions.data?.filter((x) => !x.revokedAt) ?? [];
  return (
    <>
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      <Panel title="Profile">
        <Muted style={{ marginBottom: 8 }}>{me.data?.email}</Muted>
        <Field label="Name"><Input value={name ?? me.data?.name ?? ''} onChangeText={setName} /></Field>
        <Btn label="Save name" disabled={name === null || !name.trim() || runner.busy} onPress={() => void runner.run(() => api.account.updateName(name!.trim()), async () => { setName(null); await me.reload(); })} />
      </Panel>
      <Panel title="Signed-in devices">
        {active.length === 0 ? <Empty>No other devices.</Empty> : active.map((x) => (
          <Row key={x.id}>
            <View style={{ flex: 1 }}><Text style={s.body}>{x.deviceName}</Text><Muted style={{ fontSize: 11 }}>{x.deviceType} · last active {x.lastActiveAt.slice(0, 16).replace('T', ' ')}</Muted></View>
            <Btn kind="ghost" label="Sign out" onPress={() => void runner.run(() => api.account.revokeSession(x.id), sessions.reload)} style={{ paddingVertical: 4, paddingHorizontal: 10 }} />
          </Row>
        ))}
      </Panel>
      <Panel title="Danger zone">
        <Muted style={{ marginBottom: 8 }}>Deleting your account removes everything: tasks, notes, finance, the vault. It cannot be undone.</Muted>
        {deleting ? (
          <>
            <Field label="Enter your password to confirm"><Input value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" /></Field>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Btn kind="danger" label="Delete forever" disabled={!password || runner.busy} onPress={() => void runner.run(async () => { await api.account.verifyPassword(password); await api.account.deleteAccount(password); await signOut(); })} />
              <Btn kind="ghost" label="Cancel" onPress={() => { setDeleting(false); setPassword(''); }} />
            </View>
          </>
        ) : <Btn kind="danger" label="Delete my account" onPress={() => setDeleting(true)} />}
      </Panel>
    </>
  );
}

export function ModulesTab() {
  const api = useApi();
  const runner = useRunner();
  const modules = useAsync(() => api.core.modules(), api);
  const overrides = new Map((modules.data ?? []).map((m) => [m.moduleCode, m.enabled]));
  return (
    <>
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      <Panel title="Modules">
        <Muted style={{ marginBottom: 8 }}>Switch off what you do not use. Its pages disappear from the menu and the web app.</Muted>
        {APP_MODULE_LIST.map((m) => (
          <Row key={m.code}>
            <Text style={[s.body, { flex: 1 }]}>{m.name}</Text>
            <Switch value={overrides.has(m.code) ? overrides.get(m.code)! : m.enabled} onValueChange={(v) => void runner.run(() => api.core.setModule(m.code, v), modules.reload)} trackColor={{ true: C.accent }} />
          </Row>
        ))}
      </Panel>
    </>
  );
}

export function IntegrationsTab() {
  const api = useApi();
  const runner = useRunner();
  const status = useAsync(() => api.financeTools.gmailStatus(), api);
  const boxes = status.data?.mailboxes ?? [];
  const purposes = [
    { purpose: 'FINANCE' as const, label: 'Bank alerts', hint: 'Reads bills, bank and booking mail. Never one-time codes.' },
    { purpose: 'JOBS' as const, label: 'Job mail', hint: 'Reads application and interview mail for the Job Tracker only.' },
  ];
  return (
    <>
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      <Panel title="Gmail">
        {purposes.map((p) => {
          const box = boxes.find((b) => b.purpose === p.purpose);
          return (
            <View key={p.purpose} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[s.body, { fontWeight: '700' }]}>{p.label}</Text>
                {box ? <Pill label="Connected" color={C.accent} /> : <Pill label="Not connected" />}
              </View>
              <Muted style={{ fontSize: 12 }}>{p.hint}</Muted>
              {box ? <Muted style={{ fontSize: 12 }}>{box.email ?? 'Gmail'}{box.lastRefreshedAt ? ` · checked ${box.lastRefreshedAt.slice(0, 16).replace('T', ' ')}` : ''}</Muted> : null}
              <Btn kind="ghost" label={box ? 'Use a different account' : 'Connect Gmail'} onPress={() => void runner.run(async () => { const url = await api.financeTools.gmailConnectUrl(p.purpose); await WebBrowser.openBrowserAsync(url); }, status.reload)} style={{ marginTop: 8 }} />
            </View>
          );
        })}
        <Muted style={{ fontSize: 11 }}>Google asks you to approve access in a browser window. Come back here when it says connected.</Muted>
      </Panel>
    </>
  );
}

export function NotificationsTab() {
  return <NotificationList />;
}

/** What is left to set up in each module, worked out from what already exists. */
export function SetupTab() {
  const api = useApi();
  const router = useRouter();
  const probes = useAsync(async () => {
    const safe = async <T,>(f: () => Promise<T>, fallback: T) => { try { return await f(); } catch { return fallback; } };
    const [accounts, gmail, tasks, habits, goals, events, notes, routines, vault, profile] = await Promise.all([
      safe(() => api.finance.accounts(), []), safe(() => api.financeTools.gmailStatus(), null), safe(() => api.tasks.list({}), []), safe(() => api.habits.list(), []), safe(() => api.goals.list(), []),
      safe(() => api.calendar.list('2000-01-01', '2100-01-01'), []), safe(() => api.notes.recent(1), []), safe(() => api.workouts.routines(), []), safe(() => api.vault.status(), null), safe(() => api.jobTools.profile(), null),
    ]);
    return [
      { name: 'Finance', href: '/finance', steps: [{ t: 'Add your accounts', done: accounts.length > 0 }, { t: 'Connect Gmail for bank alerts', done: !!gmail?.connected }] },
      { name: 'Tasks', href: '/tasks', steps: [{ t: 'Add your first task', done: tasks.length > 0 }] },
      { name: 'Habits', href: '/habits', steps: [{ t: 'Create your first habit', done: habits.length > 0 }] },
      { name: 'Goals', href: '/goals', steps: [{ t: 'Set a goal', done: goals.length > 0 }] },
      { name: 'Calendar', href: '/calendar', steps: [{ t: 'Add an event', done: events.length > 0 }] },
      { name: 'Notes', href: '/notes', steps: [{ t: 'Write your first note', done: notes.length > 0 }] },
      { name: 'Workouts', href: '/workouts', steps: [{ t: 'Pick a routine', done: routines.length > 0 }] },
      { name: 'Password Manager', href: '/vault', steps: [{ t: 'Create your master password', done: !!vault?.hasMasterPassword }] },
      { name: 'Job Tracker', href: '/jobs', steps: [{ t: 'Fill in your career profile', done: !!profile?.onboarded }] },
    ];
  }, api);
  return (
    <>
      {probes.error && !probes.data ? <ErrorNote message={probes.error} onRetry={probes.reload} /> : null}
      {probes.data?.map((m) => (
        <Panel key={m.name} title={`${m.name} · ${m.steps.filter((x) => x.done).length}/${m.steps.length}`}>
          {m.steps.map((st) => <Row key={st.t}><Pill label={st.done ? 'Done' : 'To do'} color={st.done ? C.accent : C.gold} /><Text style={[s.body, { flex: 1 }]}>{st.t}</Text></Row>)}
          <Btn kind="ghost" label={`Open ${m.name}`} onPress={() => router.navigate(m.href as Href)} style={{ marginTop: 8 }} />
        </Panel>
      ))}
    </>
  );
}
