import type { EmailCategory, EmailHubItem, EmailHubStatus, EmailProposal } from '@life-os/core';
import { useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/text';

import { DataGrid, type Col } from '@/grid/data-grid';
import { Btn, Progress, Screen, Seg } from '@/kit';
import { useApi } from '@/lib/session';
import { useAsync, useRunner } from '@/lib/use-async';
import { C } from '@/theme';
import { ErrorNote, Muted, Panel } from '@/ui';

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

  const columns: Col<EmailHubItem>[] = [
    { id: 'summary', title: 'What it is', value: (i) => i.summary || i.subject || '(no subject)', filter: { type: 'text' }, cell: (i) => <Text style={{ color: C.text, fontSize: 15, fontWeight: '700', flexShrink: 1 }}>{i.summary || i.subject || '(no subject)'}</Text> },
    { id: 'category', title: 'Kind', value: (i) => CATEGORY[i.category], filter: { type: 'select' } },
    { id: 'from', title: 'From', value: (i) => sender(i.fromAddress), filter: { type: 'select' } },
    { id: 'received', title: 'Received', value: (i) => (i.receivedAt ?? i.createdAt).slice(0, 10), filter: { type: 'date' } },
    { id: 'proposal', title: 'Proposal', value: (i) => describe(i.proposal) ?? '' },
    { id: 'confidence', title: 'Confidence', value: (i) => (i.confidence ? i.confidence.toLowerCase() : ''), filter: { type: 'select' }, hidden: true },
    { id: 'status', title: 'Status', value: (i) => i.status.replace('_', ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase()), filter: { type: 'select' }, hidden: true },
    { id: 'subject', title: 'Subject', value: (i) => i.subject ?? '', hidden: true },
  ];

  return (
    <Screen title="Email" onRefresh={() => void items.reload()} refreshing={items.loading} action={<Btn kind="ghost" label="Check now" onPress={() => void runner.run(() => api.emailHub.syncNow(), async () => { setNote('Reading new mail - results appear in a moment.'); setTimeout(() => void items.reload(), 8000); })} style={{ paddingVertical: 7 }} />}>
      <Muted style={{ marginBottom: 10 }}>Bills, appointments, deadlines and receipts wait here as proposals until you tap Do it. Nothing is created without your OK.</Muted>
      {handled + waiting.length > 0 ? <Panel title="Quest: clear your inbox"><Progress label={waiting.length === 0 ? 'Inbox clear' : `${waiting.length} left`} pct={(handled / (handled + waiting.length)) * 100} right={`${handled} / ${handled + waiting.length}`} /></Panel> : null}
      <Seg tabs={TABS} value={tab} onChange={setTab} />
      {items.error && !items.data ? <ErrorNote message={items.error} onRetry={items.reload} /> : null}
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      {note ? <Muted style={{ marginBottom: 8 }}>{note}</Muted> : null}
      <DataGrid
        tableId="email.inbox"
        data={shown}
        columns={columns}
        getRowId={(i) => i.id}
        loading={items.loading && !items.data}
        initialSorting={[{ id: 'received', desc: true }]}
        emptyMessage={tab === 'waiting' ? 'Nothing is waiting on you.' : tab === 'done' ? 'Nothing has been added from your email yet.' : 'Nothing skipped yet.'}
        searchPlaceholder="Search email…"
        exportName="email-proposals"
        trailing={(item) => (item.status === 'NEEDS_REVIEW' || item.status === 'FAILED') && item.proposal ? <Btn label={item.status === 'FAILED' ? 'Retry' : 'Do it'} disabled={runner.busy} onPress={() => void act(item, 'approve')} style={{ paddingVertical: 6, paddingHorizontal: 12 }} /> : null}
        rowActions={(item, close) => (
          <>
            {(item.status === 'NEEDS_REVIEW' || item.status === 'FAILED') ? (
              <>
                {item.proposal ? <Btn label={item.status === 'FAILED' ? 'Try again' : 'Do it'} disabled={runner.busy} onPress={() => { close(); void act(item, 'approve'); }} /> : null}
                <Btn kind="ghost" label="Dismiss" disabled={runner.busy} onPress={() => { close(); void act(item, 'dismiss'); }} />
              </>
            ) : null}
            {item.status === 'APPLIED' ? <Btn kind="ghost" label="Undo" disabled={runner.busy} onPress={() => { close(); void act(item, 'undo'); }} /> : null}
          </>
        )}
        drawerExtra={(item) => (describe(item.proposal) || item.note ? <View style={{ marginTop: 10, gap: 4 }}>{describe(item.proposal) ? <Text style={{ color: C.text }}>{describe(item.proposal)}</Text> : null}{item.note ? <Text style={{ color: item.status === 'FAILED' ? C.destructive : C.muted, fontSize: 12 }}>{item.note}</Text> : null}</View> : null)}
      />
    </Screen>
  );
}
