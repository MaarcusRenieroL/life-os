import type { EmailCategory, EmailHubItem, EmailHubStatus, EmailProposal } from '@life-os/core';
import { useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/text';

import { Btn, Empty, Pill, Progress, Row, Screen, Seg } from '@/kit';
import { useApi } from '@/lib/session';
import { useAsync, useRunner } from '@/lib/use-async';
import { C } from '@/theme';
import { ErrorNote, Muted, Panel, s } from '@/ui';

const WAITING: EmailHubStatus[] = ['NEEDS_REVIEW', 'FAILED'];
const DONE: EmailHubStatus[] = ['APPLIED', 'UNDONE'];
const SKIPPED: EmailHubStatus[] = ['IGNORED', 'DISMISSED'];
const ALL: EmailHubStatus[] = [...WAITING, ...DONE, ...SKIPPED];

const TABS = [{ id: 'waiting', label: 'Needs your OK' }, { id: 'done', label: 'Done for you' }, { id: 'skipped', label: 'Skipped' }] as const;
type TabId = (typeof TABS)[number]['id'];

const CATEGORY: Record<EmailCategory, string> = { TASK: 'Task', BILL: 'Bill', EVENT: 'Event', SUBSCRIPTION: 'Subscription', IGNORE: 'Skipped' };

const when = (iso: string | null | undefined, time = false) => (iso ? (time ? iso.slice(0, 16).replace('T', ' ') : iso.slice(0, 10)) : null);

/** One plain line saying exactly what will be / was created. */
function describe(p: EmailProposal | null): string | null {
  if (!p) return null;
  if (p.kind === 'TASK') return `Task: ${p.title}${p.dueDate ? ` · due ${when(p.dueDate)}` : ''}`;
  if (p.kind === 'EVENT') return `Event: ${p.title}${p.allDay ? ` · ${when(p.startDate)}` : p.startAt ? ` · ${when(p.startAt, true)}` : ''}${p.location ? ` · ${p.location}` : ''}`;
  return `Subscription: ${p.title} · ${p.amount ?? '?'} ${p.billingCycle?.toLowerCase() ?? ''}${p.nextBillingDate ? ` · next ${when(p.nextBillingDate)}` : ''}`;
}

const sender = (from: string | null) => {
  if (!from) return 'Unknown sender';
  const named = from.match(/^"?([^"<]+?)"?\s*</);
  return (named?.[1] ?? from.replace(/[<>]/g, '')).trim();
};

export default function Email() {
  const api = useApi();
  const runner = useRunner();
  const [tab, setTab] = useState<TabId>('waiting');
  const items = useAsync(() => api.emailHub.items(ALL, 200), api);
  const [note, setNote] = useState<string | null>(null);

  const all = items.data ?? [];
  const waiting = all.filter((i) => WAITING.includes(i.status));
  const done = all.filter((i) => DONE.includes(i.status));
  const skipped = all.filter((i) => SKIPPED.includes(i.status));
  const handled = all.filter((i) => i.status === 'APPLIED' || i.status === 'UNDONE' || i.status === 'DISMISSED').length;
  const shown = tab === 'waiting' ? waiting : tab === 'done' ? done : skipped;

  async function act(item: EmailHubItem, action: 'approve' | 'dismiss' | 'undo') {
    const updated = await runner.run(() => api.emailHub[action](item.id));
    if (updated && action === 'approve' && updated.status === 'FAILED') setNote(updated.note ?? 'That module rejected it.');
    await items.reload();
  }

  return (
    <Screen title="Email" onRefresh={() => void items.reload()} refreshing={items.loading} action={<Btn kind="ghost" label="Check now" onPress={() => void runner.run(() => api.emailHub.syncNow(), async () => { setNote('Reading new mail - results appear in a moment.'); setTimeout(() => void items.reload(), 8000); })} style={{ paddingVertical: 7 }} />}>
      <Muted style={{ marginBottom: 10 }}>Bills, appointments, deadlines and receipts wait here as proposals until you tap Do it. Nothing is created without your OK.</Muted>
      {handled + waiting.length > 0 ? <Panel title="Quest: clear your inbox"><Progress label={waiting.length === 0 ? 'Inbox clear' : `${waiting.length} left`} pct={(handled / (handled + waiting.length)) * 100} right={`${handled} / ${handled + waiting.length}`} /></Panel> : null}
      <Seg tabs={TABS} value={tab} onChange={setTab} />
      {items.error && !items.data ? <ErrorNote message={items.error} onRetry={items.reload} /> : null}
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      {note ? <Muted style={{ marginBottom: 8 }}>{note}</Muted> : null}
      <Panel title={`${shown.length} ${tab === 'waiting' ? 'waiting' : tab === 'done' ? 'handled' : 'skipped'}`}>
        {shown.length === 0 ? <Empty>{tab === 'waiting' ? 'Nothing is waiting on you.' : tab === 'done' ? 'Nothing has been added from your email yet.' : 'Nothing skipped yet.'}</Empty> : shown.map((item) => (
          <Row key={item.id}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 2 }}><Pill label={CATEGORY[item.category]} color={C.cyan} />{item.confidence && item.status === 'NEEDS_REVIEW' ? <Pill label={`${item.confidence.toLowerCase()} confidence`} /> : null}</View>
              <Text style={[s.body, { fontWeight: '700' }]}>{item.summary || item.subject || '(no subject)'}</Text>
              {describe(item.proposal) ? <Text style={s.body}>{describe(item.proposal)}</Text> : null}
              <Muted style={{ fontSize: 11 }}>{sender(item.fromAddress)}{item.subject ? ` · ${item.subject}` : ''}</Muted>
              {item.note ? <Text style={{ color: item.status === 'FAILED' ? C.destructive : C.muted, fontSize: 11 }}>{item.note}</Text> : null}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                {(item.status === 'NEEDS_REVIEW' || item.status === 'FAILED') ? (
                  <>
                    {item.proposal ? <Btn label={item.status === 'FAILED' ? 'Try again' : 'Do it'} disabled={runner.busy} onPress={() => void act(item, 'approve')} style={{ paddingVertical: 6, paddingHorizontal: 12 }} /> : null}
                    <Btn kind="ghost" label="Dismiss" disabled={runner.busy} onPress={() => void act(item, 'dismiss')} style={{ paddingVertical: 6, paddingHorizontal: 12 }} />
                  </>
                ) : null}
                {item.status === 'APPLIED' ? <Btn kind="ghost" label="Undo" disabled={runner.busy} onPress={() => void act(item, 'undo')} style={{ paddingVertical: 6, paddingHorizontal: 12 }} /> : null}
              </View>
            </View>
          </Row>
        ))}
      </Panel>
    </Screen>
  );
}
