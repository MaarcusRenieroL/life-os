import type { EmailCategory, EmailHubItem, EmailHubStatus, EmailProposal } from '@life-os/core';
import { useState } from 'react';

import { useApi } from '../lib/session';
import { useAsync, useRunner } from '../lib/use-async';
import { DataGrid, type Col } from '../grid/data-grid';
import { ErrorNote, Panel, ProgressRow, Tabs } from '../ui';

const WAITING: EmailHubStatus[] = ['NEEDS_REVIEW', 'FAILED'];
const DONE: EmailHubStatus[] = ['APPLIED', 'UNDONE'];
const SKIPPED: EmailHubStatus[] = ['IGNORED', 'DISMISSED'];
const ALL: EmailHubStatus[] = [...WAITING, ...DONE, ...SKIPPED];

const TABS = [{ id: 'waiting', label: 'Needs your OK' }, { id: 'done', label: 'Done for you' }, { id: 'skipped', label: 'Skipped' }] as const;
type TabId = (typeof TABS)[number]['id'];
const CATEGORY: Record<EmailCategory, string> = { TASK: 'Task', BILL: 'Bill', EVENT: 'Event', SUBSCRIPTION: 'Subscription', IGNORE: 'Skipped' };

const when = (iso: string | null | undefined, time = false) => (iso ? (time ? iso.slice(0, 16).replace('T', ' ') : iso.slice(0, 10)) : null);

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

export function EmailScreen() {
  const api = useApi();
  const runner = useRunner();
  const [tab, setTab] = useState<TabId>('waiting');
  const [note, setNote] = useState<string | null>(null);
  const items = useAsync(() => api.emailHub.items(ALL, 200), [api]);

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
    { id: 'category', title: 'Kind', value: (i) => CATEGORY[i.category], filter: { type: 'select' } },
    {
      id: 'summary', title: 'What it is', value: (i) => i.summary || i.subject || '(no subject)', filter: { type: 'text' },
      cell: (i) => (
        <div>
          <b>{i.summary || i.subject || '(no subject)'}</b>
          {describe(i.proposal) && <div>{describe(i.proposal)}</div>}
          {i.note && <div className={i.status === 'FAILED' ? 'error' : 'muted'}>{i.note}</div>}
        </div>
      ),
    },
    { id: 'from', title: 'From', value: (i) => sender(i.fromAddress), filter: { type: 'select' } },
    { id: 'subject', title: 'Subject', value: (i) => i.subject ?? '', hidden: true },
    { id: 'confidence', title: 'Confidence', value: (i) => (i.confidence ? i.confidence.toLowerCase() : ''), filter: { type: 'select' } },
    { id: 'status', title: 'Status', value: (i) => i.status.replace('_', ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase()), filter: { type: 'select' } },
    { id: 'received', title: 'Received', value: (i) => (i.receivedAt ?? i.createdAt).slice(0, 10), filter: { type: 'date' } },
  ];

  return (
    <div className="stack">
      <div className="row">
        <p className="muted grow">Bills, appointments, deadlines and receipts wait here as proposals until you click Do it. Nothing is created without your OK.</p>
        <button className="ghost" disabled={runner.busy} onClick={() => void runner.run(() => api.emailHub.syncNow(), async () => { setNote('Reading new mail - results appear in a moment.'); setTimeout(() => void items.reload(), 8000); })}>Check now</button>
      </div>
      {handled + waiting.length > 0 && <Panel title="Quest: clear your inbox"><ProgressRow label={waiting.length === 0 ? 'Inbox clear' : `${waiting.length} left`} pct={(handled / (handled + waiting.length)) * 100} right={`${handled} / ${handled + waiting.length}`} /></Panel>}
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      {items.error && !items.data && <ErrorNote message={items.error} onRetry={items.reload} />}
      {runner.error && <ErrorNote message={runner.error} />}
      {note && <p className="muted">{note}</p>}
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
        rowActions={(item) => (
          <>
            {(item.status === 'NEEDS_REVIEW' || item.status === 'FAILED') && (
              <>
                {item.proposal && <button className="primary g-btn" disabled={runner.busy} onClick={() => void act(item, 'approve')}>{item.status === 'FAILED' ? 'Try again' : 'Do it'}</button>}
                <button className="ghost g-btn" disabled={runner.busy} onClick={() => void act(item, 'dismiss')}>Dismiss</button>
              </>
            )}
            {item.status === 'APPLIED' && <button className="ghost g-btn" disabled={runner.busy} onClick={() => void act(item, 'undo')}>Undo</button>}
          </>
        )}
      />
    </div>
  );
}
