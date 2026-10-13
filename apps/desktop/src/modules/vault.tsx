import { CARD_NETWORKS, DEFAULT_GENERATOR, entryStrengthMap, generatePassword, maskCard, parseCsv, type ApiCardNetwork, type AuditEvent, type VaultEntryDetail, type VaultEntrySummary, type VaultEntryType, type VaultEntryWriteRequest } from '@life-os/core';
import { useRef, useState, type FormEvent, type ReactNode } from 'react';

import { useApi } from '../lib/session';
import { useAsync, useRunner } from '../lib/use-async';
import { DataGrid, type Col } from '../grid/data-grid';
import { Bars, Empty, ErrorNote, Field, Modal, opts, Panel, pretty, ProgressRow, Select, Stat } from '../ui';

/** A uniformly random integer in [0, max) from the browser's secure random source. */
function randomInt(max: number): number {
  const limit = Math.floor(0x1_0000_0000 / max) * max;
  const buffer = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buffer);
    if (buffer[0] < limit) return buffer[0] % max;
  }
}

/** Copies a secret and clears the clipboard 30 seconds later if nothing else was copied since. */
function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const token = useRef(0);
  return {
    copied,
    copy: async (value: string, key: string) => {
      await navigator.clipboard.writeText(value);
      const mine = ++token.current;
      setCopied(key);
      setTimeout(async () => {
        if (token.current !== mine) return;
        try {
          if ((await navigator.clipboard.readText()) === value) await navigator.clipboard.writeText('');
        } catch { /* clipboard read can be denied; the copy simply stays */ }
        setCopied(null);
      }, 30_000);
    },
  };
}

/** Keeps the vault behind its master password: first-time setup, then unlock. */
export function VaultGate({ children }: { children: ReactNode }) {
  const api = useApi();
  const runner = useRunner();
  const status = useAsync(() => api.vault.status(), [api]);
  const [pw, setPw] = useState('');
  const [again, setAgain] = useState('');
  const st = status.data;
  if (status.error && !st) return <ErrorNote message={status.error} onRetry={status.reload} />;
  if (!st) return <p className="muted">Checking the vault…</p>;
  if (st.hasMasterPassword && st.unlocked) return <>{children}</>;
  const setup = !st.hasMasterPassword;

  async function submit(event: FormEvent) {
    event.preventDefault();
    await runner.run(() => (setup ? api.vault.setup(pw) : api.vault.verify(pw)), async () => { setPw(''); setAgain(''); await status.reload(); });
  }

  return (
    <Panel title={setup ? 'Create your master password' : 'Unlock the vault'}>
      <form className="stack" onSubmit={submit}>
        <p className="muted">{setup ? 'It encrypts everything here and cannot be recovered, so choose one you will remember.' : 'Enter your master password to see your passwords.'}</p>
        <Field label="Master password"><input autoFocus type="password" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
        {setup && <Field label="Repeat it"><input type="password" value={again} onChange={(e) => setAgain(e.target.value)} /></Field>}
        {runner.error && <ErrorNote message={runner.error} />}
        <div className="actions"><button className="primary" disabled={runner.busy || pw.length < (setup ? 8 : 1) || (setup && pw !== again)}>{setup ? 'Create' : 'Unlock'}</button></div>
        {setup && pw.length > 0 && pw.length < 8 && <p className="muted">At least 8 characters.</p>}
      </form>
    </Panel>
  );
}

// ------------------------------------------------------------------ entries
export function EntriesTab() {
  const api = useApi();
  const entries = useAsync(() => api.vault.entries(), [api]);
  const categories = useAsync(() => api.vault.categories(), [api]);
  const health = useAsync(() => api.vault.health(), [api]);
  const [open, setOpen] = useState<string | 'new' | null>(null);
  const strength = entryStrengthMap(health.data?.actionRequired ?? []);
  const catName = (id: string | null) => categories.data?.find((c) => c.id === id)?.name ?? '';
  const columns: Col<VaultEntrySummary>[] = [
    { id: 'title', title: 'Title', value: (e) => e.title, filter: { type: 'text' }, cell: (e) => <b>{e.title}{e.favorite ? ' ★' : ''}</b> },
    { id: 'login', title: 'Login', value: (e) => e.username || e.email || '', filter: { type: 'text' } },
    { id: 'url', title: 'Website', value: (e) => e.url ?? '' },
    { id: 'folder', title: 'Folder', value: (e) => catName(e.categoryId) || 'None', filter: { type: 'select' } },
    { id: 'type', title: 'Type', value: (e) => pretty(e.type), filter: { type: 'select' } },
    { id: 'strength', title: 'Strength', value: (e) => strength.get(e.id) ?? 'Strong', filter: { type: 'select' }, cell: (e) => { const l = strength.get(e.id) ?? 'Strong'; return <span className={`g-chip ${l === 'Strong' ? 'success' : 'danger'}`}>{l}</span>; } },
    { id: 'favorite', title: 'Favourite', value: (e) => e.favorite, filter: { type: 'boolean' }, hidden: true },
    { id: 'expires', title: 'Expires', value: (e) => (e.expiresAt ?? '').slice(0, 10), filter: { type: 'date' }, hidden: true },
    { id: 'updated', title: 'Updated', value: (e) => e.updatedAt.slice(0, 10), filter: { type: 'date' } },
  ];
  return (
    <>
      {entries.error && !entries.data && <ErrorNote message={entries.error} onRetry={entries.reload} />}
      <DataGrid
        tableId="vault.entries"
        data={entries.data ?? []}
        columns={columns}
        getRowId={(e) => e.id}
        loading={entries.loading && !entries.data}
        initialSorting={[{ id: 'title', desc: false }]}
        emptyMessage="No entries found."
        searchPlaceholder="Search entries…"
        onRowClick={(e) => setOpen(e.id)}
        drawer={false}
        views={[{ id: 'fav', name: 'Favourites', filters: { favorite: ['true'] } }, { id: 'weak', name: 'Needs attention', filters: { strength: ['Weak', 'Reused', 'Compromised', 'Old'] } }]}
        toolbarEnd={<button className="primary g-btn" onClick={() => setOpen('new')}>+ Add entry</button>}
      />
      {open && <EntryModal id={open === 'new' ? null : open} categories={categories.data ?? []} onClose={() => setOpen(null)} onChanged={async () => { setOpen(null); await Promise.all([entries.reload(), health.reload()]); }} />}
    </>
  );
}

function EntryModal({ id, categories, onClose, onChanged }: { id: string | null; categories: { id: string; name: string }[]; onClose: () => void; onChanged: () => Promise<void> }) {
  const api = useApi();
  const runner = useRunner();
  const { copy, copied } = useCopy();
  const loaded = useAsync<VaultEntryDetail | null>(() => (id ? api.vault.entry(id) : Promise.resolve(null)), [api, id]);
  const [form, setForm] = useState<VaultEntryWriteRequest | null>(null);
  const [editing, setEditing] = useState(id === null);
  const [show, setShow] = useState(false);
  const e = loaded.data;
  const f: VaultEntryWriteRequest = form ?? { type: e?.type ?? 'LOGIN', title: e?.title ?? '', email: e?.email ?? '', username: e?.username ?? '', url: e?.url ?? '', password: e?.password ?? '', notes: e?.notes ?? '', categoryId: e?.categoryId ?? null, favorite: e?.favorite ?? false, expiresAt: e?.expiresAt ?? null };
  const set = (patch: Partial<VaultEntryWriteRequest>) => setForm({ ...f, ...patch });

  async function save(event: FormEvent) {
    event.preventDefault();
    const body: VaultEntryWriteRequest = { ...f, title: f.title.trim(), email: f.email || null, username: f.username || null, url: f.url || null, password: f.password || null, notes: f.notes || null };
    if (await runner.run(() => (id ? api.vault.updateEntry(id, body) : api.vault.createEntry(body)))) await onChanged();
  }

  const copyRow = (label: string, value: string, key: string, extra?: ReactNode) => (
    <div className="row" style={{ gap: 8, margin: '6px 0' }}>
      <span className="grow"><small className="muted">{label}</small><div style={{ wordBreak: 'break-all' }}>{value}</div></span>
      {extra}
      <button className="ghost" onClick={() => void copy(key === 'p' ? e?.password ?? '' : value, key)}>{copied === key ? 'Copied' : 'Copy'}</button>
    </div>
  );

  return (
    <Modal title={id ? (editing ? 'Edit entry' : f.title || 'Entry') : 'New entry'} onClose={onClose}>
      {loaded.error && <ErrorNote message={loaded.error} />}
      {id && !e && !loaded.error ? <p className="muted">Loading…</p> : !editing && e ? (
        <div className="stack">
          {e.username && copyRow('Username', e.username, 'u')}
          {e.email && copyRow('Email', e.email, 'e')}
          {e.password !== null && copyRow('Password', show ? e.password ?? '' : '•'.repeat(Math.max(8, e.password?.length ?? 8)), 'p', <button className="ghost" onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button>)}
          {e.url && copyRow('Website', e.url, 'w')}
          {e.notes && <div><small className="muted">Notes</small><div>{e.notes}</div></div>}
          {copied && <small className="muted">Copied. The clipboard clears itself in 30 seconds.</small>}
          <div className="actions">
            <button className="danger" onClick={() => void runner.run(() => api.vault.deleteEntry(e.id), onChanged)}>Delete</button>
            <button className="primary" onClick={() => setEditing(true)}>Edit</button>
          </div>
        </div>
      ) : (
        <form className="stack" onSubmit={save}>
          <div className="cols">
            <Field label="Type"><Select value={f.type} onChange={(v) => v && set({ type: v as VaultEntryType })} options={opts(['LOGIN', 'CARD', 'NOTE'] as const)} /></Field>
            <Field label="Title"><input autoFocus value={f.title} onChange={(ev) => set({ title: ev.target.value })} /></Field>
            <Field label="Username"><input value={f.username ?? ''} onChange={(ev) => set({ username: ev.target.value })} autoComplete="off" /></Field>
            <Field label="Email"><input type="email" value={f.email ?? ''} onChange={(ev) => set({ email: ev.target.value })} /></Field>
          </div>
          <Field label="Password">
            <div className="row" style={{ gap: 8 }}>
              <input className="grow" type={show ? 'text' : 'password'} value={f.password ?? ''} onChange={(ev) => set({ password: ev.target.value })} autoComplete="off" />
              <button type="button" className="ghost" onClick={() => set({ password: generatePassword(DEFAULT_GENERATOR, randomInt) })}>Generate</button>
              <button type="button" className="ghost" onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button>
            </div>
          </Field>
          <div className="cols">
            <Field label="Website"><input value={f.url ?? ''} onChange={(ev) => set({ url: ev.target.value })} /></Field>
            <Field label="Folder"><Select value={f.categoryId ?? ''} onChange={(v) => set({ categoryId: v || null })} options={categories.map((c) => ({ value: c.id, label: c.name }))} placeholder="None" /></Field>
            <Field label="Expires"><input type="date" value={f.expiresAt?.slice(0, 10) ?? ''} onChange={(ev) => set({ expiresAt: ev.target.value || null })} /></Field>
            <Field label="Favorite"><input type="checkbox" checked={!!f.favorite} onChange={(ev) => set({ favorite: ev.target.checked })} /></Field>
          </div>
          <Field label="Notes"><textarea rows={3} value={f.notes ?? ''} onChange={(ev) => set({ notes: ev.target.value })} /></Field>
          {runner.error && <ErrorNote message={runner.error} />}
          <div className="actions"><button className="primary" disabled={!f.title.trim() || runner.busy}>Save</button></div>
        </form>
      )}
    </Modal>
  );
}

// ------------------------------------------------------------------ health
export function HealthTab() {
  const api = useApi();
  const health = useAsync(() => api.vault.health(), [api]);
  const h = health.data;
  return (
    <>
      {health.error && !h && <ErrorNote message={health.error} onRetry={health.reload} />}
      <Panel title="Vault health">
        <ProgressRow label="Security score" pct={h?.score ?? 0} right={h ? `${Math.round(h.score)}/100` : '—'} />
        <div className="stats"><Stat label="Entries" value={h?.totalCount ?? '—'} /><Stat label="Weak" value={h?.weakCount ?? '—'} /><Stat label="Reused" value={h?.duplicateCount ?? '—'} /><Stat label="Compromised" value={h?.compromisedCount ?? '—'} /></div>
      </Panel>
      <div className="grid">
        <Panel title="Password age">{h?.ageBuckets.length ? <Bars rows={h.ageBuckets.map((b) => ({ label: b.label, value: b.count }))} /> : <Empty>No data yet.</Empty>}</Panel>
        <Panel title="Action required">{h?.actionRequired.length ? <ul className="list">{h.actionRequired.map((a) => <li key={a.id}><span className="grow"><b>{a.title}</b><div className="muted">{a.issue}</div></span></li>)}</ul> : <Empty>Nothing to fix.</Empty>}</Panel>
      </div>
    </>
  );
}

// ------------------------------------------------------------------ cards
export function CardsTab() {
  const api = useApi();
  const runner = useRunner();
  const cards = useAsync(() => api.vault.cards(), [api]);
  const [adding, setAdding] = useState(false);
  return (
    <>
      <div className="row"><span className="grow" /><button className="primary" onClick={() => setAdding(true)}>+ Add card</button></div>
      {cards.error && !cards.data && <ErrorNote message={cards.error} onRetry={cards.reload} />}
      {runner.error && <ErrorNote message={runner.error} />}
      <Panel title={`${cards.data?.length ?? 0} cards`}>
        {cards.data?.length === 0 ? <Empty>No cards saved.</Empty> : (
          <ul className="list">
            {cards.data?.map((c) => (
              <li key={c.id}><span className="grow"><b>{c.nickname}</b><div className="muted">{c.network} · {maskCard(c)}</div><small className="muted">{c.cardHolderName} · expires {c.expiry}</small></span><button className="danger" onClick={() => void runner.run(() => api.vault.deleteCard(c.id), cards.reload)}>Delete</button></li>
            ))}
          </ul>
        )}
      </Panel>
      {adding && <CardModal onClose={() => setAdding(false)} onSaved={async () => { setAdding(false); await cards.reload(); }} />}
    </>
  );
}

function CardModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => Promise<void> }) {
  const api = useApi();
  const runner = useRunner();
  const [f, setF] = useState({ nickname: '', network: 'VISA' as ApiCardNetwork, cardNumber: '', cvv: '', expiry: '', cardHolderName: '', billingZip: '' });
  const set = (patch: Partial<typeof f>) => setF({ ...f, ...patch });
  async function save(event: FormEvent) {
    event.preventDefault();
    await runner.run(() => api.vault.createCard({ ...f, cardNumber: f.cardNumber.replace(/\D/g, '') }), onSaved);
  }
  return (
    <Modal title="Add a card" onClose={onClose}>
      <form className="stack" onSubmit={save}>
        <div className="cols">
          <Field label="Nickname"><input autoFocus value={f.nickname} onChange={(e) => set({ nickname: e.target.value })} /></Field>
          <Field label="Network"><Select value={f.network} onChange={(v) => v && set({ network: v })} options={CARD_NETWORKS.map((n) => ({ value: n, label: n }))} /></Field>
          <Field label="Card number"><input inputMode="numeric" value={f.cardNumber} onChange={(e) => set({ cardNumber: e.target.value.replace(/[^\d ]/g, '') })} /></Field>
          <Field label="Expiry (MM/YY)"><input value={f.expiry} onChange={(e) => set({ expiry: e.target.value })} placeholder="08/29" /></Field>
          <Field label="CVV"><input type="password" inputMode="numeric" value={f.cvv} onChange={(e) => set({ cvv: e.target.value.replace(/\D/g, '') })} /></Field>
          <Field label="Name on card"><input value={f.cardHolderName} onChange={(e) => set({ cardHolderName: e.target.value })} /></Field>
          <Field label="Billing ZIP / PIN"><input value={f.billingZip} onChange={(e) => set({ billingZip: e.target.value })} /></Field>
        </div>
        {runner.error && <ErrorNote message={runner.error} />}
        <div className="actions"><button className="primary" disabled={runner.busy || !f.nickname.trim() || f.cardNumber.replace(/\D/g, '').length < 12 || f.cvv.length < 3 || !f.expiry.trim()}>Save card</button></div>
      </form>
    </Modal>
  );
}

// ------------------------------------------------------------------ security
export function SecurityTab() {
  const api = useApi();
  const runner = useRunner();
  const status = useAsync(() => api.vault.status(), [api]);
  const codes = useAsync(() => api.vault.recoveryCodes(), [api]);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [fresh, setFresh] = useState<string[] | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const { copy } = useCopy();
  return (
    <>
      <Panel title="Master password">
        <form className="stack" onSubmit={(e) => { e.preventDefault(); void runner.run(() => api.vault.changeMasterPassword(current, next), async () => { setCurrent(''); setNext(''); setDone('Master password changed.'); await status.reload(); }); }}>
          <p className="muted">Strength: {status.data?.masterPasswordStrength?.replace('_', ' ').toLowerCase() ?? '—'}{status.data?.masterPasswordUpdatedAt ? ` · changed ${status.data.masterPasswordUpdatedAt.slice(0, 10)}` : ''}</p>
          <div className="cols">
            <Field label="Current"><input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} /></Field>
            <Field label="New"><input type="password" value={next} onChange={(e) => setNext(e.target.value)} /></Field>
          </div>
          {runner.error && <ErrorNote message={runner.error} />}
          {done && <p className="muted">{done}</p>}
          <div className="actions"><button className="primary" disabled={runner.busy || !current || next.length < 8}>Change master password</button></div>
        </form>
      </Panel>
      <Panel title="Recovery codes">
        <p className="muted">One-time codes that let you reset the master password if you forget it. Generating new ones replaces the old.</p>
        {codes.data?.length ? <ul className="list">{codes.data.map((c) => <li key={c.id}><span className="grow">Code from {c.createdAt.slice(0, 10)}</span><span className={`pill ${c.used ? '' : 'good'}`}>{c.used ? 'Used' : 'Unused'}</span></li>)}</ul> : <Empty>No codes yet.</Empty>}
        <div className="actions"><button className="ghost" disabled={!current || runner.busy} onClick={() => void runner.run(() => api.vault.generateRecoveryCodes(current)).then((r) => { if (r) { setFresh(r.codes); void codes.reload(); } })}>Generate new codes</button></div>
        <small className="muted">Enter your current master password above first.</small>
      </Panel>
      {fresh && (
        <Modal title="Your recovery codes" onClose={() => setFresh(null)}>
          <p className="muted">Save these now. They are shown only once.</p>
          <pre>{fresh.join('\n')}</pre>
          <div className="actions"><button className="primary" onClick={() => void copy(fresh.join('\n'), 'codes')}>Copy all</button></div>
        </Modal>
      )}
    </>
  );
}

// ------------------------------------------------------------------ audit log
export function AuditTab() {
  const api = useApi();
  // Everything is loaded and handled here so search, filters and sorting cover every event.
  const events = useAsync(async () => {
    const all: AuditEvent[] = [];
    for (let page = 0; page < 10; page++) {
      const result = await api.audit.events(page, 200);
      all.push(...result.content);
      if (result.last || result.content.length === 0) break;
    }
    return all;
  }, [api]);
  const columns: Col<AuditEvent>[] = [
    { id: 'when', title: 'When', value: (e) => e.occurredAt.slice(0, 16).replace('T', ' '), filter: { type: 'date' } },
    { id: 'description', title: 'What happened', value: (e) => e.description, filter: { type: 'text' } },
    { id: 'type', title: 'Event', value: (e) => e.eventType.replace(/_/g, ' ').toLowerCase(), filter: { type: 'select' } },
    { id: 'service', title: 'Service', value: (e) => e.service, filter: { type: 'select' } },
  ];
  return (
    <>
      {events.error && !events.data && <ErrorNote message={events.error} onRetry={events.reload} />}
      <DataGrid
        tableId="vault.audit-log"
        data={events.data ?? []}
        columns={columns}
        getRowId={(e) => e.eventId}
        loading={events.loading && !events.data}
        initialSorting={[{ id: 'when', desc: true }]}
        emptyMessage="Nothing recorded yet."
        searchPlaceholder="Search the log…"
        exportName="audit-log"
        initialPageSize={50}
      />
    </>
  );
}

// ------------------------------------------------------------------ data
function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function DataTab() {
  const api = useApi();
  const runner = useRunner();
  const backup = useAsync(() => api.audit.latestBackup(), [api]);
  const [csv, setCsv] = useState('');
  const [result, setResult] = useState<string | null>(null);

  async function importCsv() {
    const rows = parseCsv(csv);
    if (rows.length < 2) { setResult('Paste or choose a CSV with a header row and at least one entry.'); return; }
    const head = rows[0].map((h) => h.trim().toLowerCase());
    const col = (...names: string[]) => head.findIndex((h) => names.includes(h));
    const [iName, iUrl, iUser, iPass, iNote] = [col('name', 'title'), col('url', 'website'), col('username', 'login'), col('password'), col('note', 'notes')];
    if (iName < 0 || iPass < 0) { setResult('The CSV needs "name" and "password" columns.'); return; }
    let ok = 0;
    for (const r of rows.slice(1)) {
      try {
        await api.vault.createEntry({ type: 'LOGIN', title: r[iName]?.trim() || 'Untitled', url: iUrl >= 0 ? r[iUrl] || null : null, username: iUser >= 0 ? r[iUser] || null : null, password: r[iPass] || null, notes: iNote >= 0 ? r[iNote] || null : null });
        ok += 1;
      } catch { /* counted below */ }
    }
    setResult(`Imported ${ok} of ${rows.length - 1} entries.`);
    setCsv('');
  }

  return (
    <>
      {runner.error && <ErrorNote message={runner.error} />}
      <Panel title="Export">
        <p className="muted">Saves a JSON file of every entry, passwords included. Keep it somewhere safe and delete it after use.</p>
        <div className="actions"><button className="ghost" disabled={runner.busy} onClick={() => void runner.run(async () => download('life-os-vault.json', JSON.stringify(await api.vault.exportAll(), null, 2), 'application/json'))}>Export vault</button></div>
      </Panel>
      <Panel title="Import from CSV">
        <p className="muted">From another password manager. Columns: name, url, username, password, notes.</p>
        <input type="file" accept=".csv,text/csv" onChange={(e) => void e.target.files?.[0]?.text().then(setCsv)} />
        <textarea rows={6} value={csv} onChange={(e) => setCsv(e.target.value)} placeholder="name,url,username,password,notes" style={{ marginTop: 8 }} />
        {result && <p className="muted">{result}</p>}
        <div className="actions"><button className="primary" disabled={!csv.trim() || runner.busy} onClick={() => void runner.run(importCsv)}>Import</button></div>
      </Panel>
      <Panel title="Backup">
        <p className="muted">{backup.data ? `Latest backup: ${backup.data.createdAt.slice(0, 16).replace('T', ' ')}` : 'No backup yet.'}</p>
        <div className="actions">
          <button className="primary" disabled={runner.busy} onClick={() => void runner.run(() => api.audit.runBackup(), backup.reload)}>Back up now</button>
          <button className="ghost" disabled={runner.busy || !backup.data} onClick={() => void runner.run(() => api.audit.restoreBackup(), backup.reload)}>Restore latest</button>
        </div>
      </Panel>
    </>
  );
}
