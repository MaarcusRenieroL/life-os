import { CARD_NETWORKS, DEFAULT_GENERATOR, entryStrengthMap, generatePassword, maskCard, parseCsv, type ApiCardNetwork, type VaultCard, type VaultEntryDetail, type VaultEntrySummary, type VaultEntryType, type VaultEntryWriteRequest } from '@life-os/core';
import * as Clipboard from 'expo-clipboard';
import * as Crypto from 'expo-crypto';
import { useRef, useState, type ReactNode } from 'react';
import { Share, Switch, View } from 'react-native';
import { Text } from '@/text';

import { Bars, Btn, Chips, DateInput, Empty, Field, Input, opts, Pill, Progress, Row, Sheet, Stat, StatGrid } from '@/kit';
import { useApi } from '@/lib/session';
import { useAsync, useRunner } from '@/lib/use-async';
import { C } from '@/theme';
import { ErrorNote, Muted, Panel, s } from '@/ui';

/** A uniformly random integer in [0, max) from the device's secure random source. */
function randomInt(max: number): number {
  const limit = Math.floor(0x1_0000_0000 / max) * max;
  for (;;) {
    const b = Crypto.getRandomBytes(4);
    const n = ((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0;
    if (n < limit) return n % max;
  }
}

/** Copies a secret and clears it from the clipboard 30 seconds later (if nothing else was copied since). */
function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const token = useRef(0);
  return {
    copied,
    copy: async (value: string, key: string) => {
      await Clipboard.setStringAsync(value);
      const mine = ++token.current;
      setCopied(key);
      setTimeout(async () => {
        if (token.current !== mine) return;
        if ((await Clipboard.getStringAsync()) === value) await Clipboard.setStringAsync('');
        setCopied(null);
      }, 30_000);
    },
  };
}

/** Keeps the vault behind its master password: first-time setup, then unlock. */
export function VaultGate({ children }: { children: ReactNode }) {
  const api = useApi();
  const runner = useRunner();
  const status = useAsync(() => api.vault.status(), api);
  const [pw, setPw] = useState('');
  const [again, setAgain] = useState('');
  const st = status.data;
  if (status.error && !st) return <ErrorNote message={status.error} onRetry={status.reload} />;
  if (!st) return <Muted>Checking the vault…</Muted>;
  if (st.hasMasterPassword && st.unlocked) return <>{children}</>;

  const setup = !st.hasMasterPassword;
  return (
    <Panel title={setup ? 'Create your master password' : 'Unlock the vault'}>
      <Muted style={{ marginBottom: 10 }}>{setup ? 'It encrypts everything here and cannot be recovered, so choose one you will remember.' : 'Enter your master password to see your passwords.'}</Muted>
      <Field label="Master password"><Input value={pw} onChangeText={setPw} secureTextEntry autoCapitalize="none" autoCorrect={false} /></Field>
      {setup ? <Field label="Repeat it"><Input value={again} onChangeText={setAgain} secureTextEntry autoCapitalize="none" autoCorrect={false} /></Field> : null}
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      <Btn label={setup ? 'Create' : 'Unlock'} disabled={runner.busy || pw.length < (setup ? 8 : 1) || (setup && pw !== again)} onPress={() => void runner.run(() => (setup ? api.vault.setup(pw) : api.vault.verify(pw)), async () => { setPw(''); setAgain(''); await status.reload(); })} />
      {setup && pw.length > 0 && pw.length < 8 ? <Muted style={{ marginTop: 6 }}>At least 8 characters.</Muted> : null}
    </Panel>
  );
}

// ------------------------------------------------------------------ entries
export function EntriesTab() {
  const api = useApi();
  const entries = useAsync(() => api.vault.entries(), api);
  const categories = useAsync(() => api.vault.categories(), api);
  const health = useAsync(() => api.vault.health(), api);
  const [search, setSearch] = useState('');
  const [chip, setChip] = useState('');
  const [open, setOpen] = useState<string | 'new' | null>(null);
  const strength = entryStrengthMap(health.data?.actionRequired ?? []);
  const term = search.trim().toLowerCase();
  const list = (entries.data ?? []).filter((e) => (!term || [e.title, e.username, e.email, e.url].filter(Boolean).join(' ').toLowerCase().includes(term)) && (!chip || (chip === 'favorites' ? e.favorite : e.categoryId === chip)));
  const catName = (id: string | null) => categories.data?.find((c) => c.id === id)?.name;
  return (
    <>
      <Input value={search} onChangeText={setSearch} placeholder="Search entries…" style={{ marginBottom: 10 }} />
      <View style={{ marginBottom: 10 }}><Chips value={chip} onChange={setChip} clearable options={[{ value: 'favorites', label: '★ Favorites' }, ...(categories.data ?? []).map((c) => ({ value: c.id, label: c.name }))]} /></View>
      <Btn label="+ Add entry" onPress={() => setOpen('new')} style={{ marginBottom: 12 }} />
      {entries.error && !entries.data ? <ErrorNote message={entries.error} onRetry={entries.reload} /> : null}
      <Panel title={`${list.length} entries`}>
        {list.length === 0 && !entries.loading ? <Empty>No entries found.</Empty> : list.map((e) => {
          const label = strength.get(e.id) ?? 'Strong';
          return (
            <Row key={e.id} onPress={() => setOpen(e.id)}>
              <View style={{ flex: 1 }}>
                <Text style={[s.body, { fontWeight: '700' }]}>{e.title}{e.favorite ? ' ★' : ''}</Text>
                <Muted style={{ fontSize: 12 }}>{e.username || e.email || e.url || '—'}{catName(e.categoryId) ? ` · ${catName(e.categoryId)}` : ''}</Muted>
              </View>
              <Pill label={label} color={label === 'Strong' ? C.accent : C.destructive} />
            </Row>
          );
        })}
      </Panel>
      {open ? <EntrySheet id={open === 'new' ? null : open} categories={categories.data ?? []} onClose={() => setOpen(null)} onChanged={async () => { setOpen(null); await Promise.all([entries.reload(), health.reload()]); }} /> : null}
    </>
  );
}

function EntrySheet({ id, categories, onClose, onChanged }: { id: string | null; categories: { id: string; name: string }[]; onClose: () => void; onChanged: () => Promise<void> }) {
  const api = useApi();
  const runner = useRunner();
  const { copy, copied } = useCopy();
  const loaded = useAsync<VaultEntryDetail | null>(() => (id ? api.vault.entry(id) : Promise.resolve(null)), id);
  const [form, setForm] = useState<VaultEntryWriteRequest | null>(null);
  const [editing, setEditing] = useState(id === null);
  const [show, setShow] = useState(false);
  const e = loaded.data;
  const f: VaultEntryWriteRequest = form ?? { type: e?.type ?? 'LOGIN', title: e?.title ?? '', email: e?.email ?? '', username: e?.username ?? '', url: e?.url ?? '', password: e?.password ?? '', notes: e?.notes ?? '', categoryId: e?.categoryId ?? null, favorite: e?.favorite ?? false, expiresAt: e?.expiresAt ?? null };
  const set = (patch: Partial<VaultEntryWriteRequest>) => setForm({ ...f, ...patch });

  async function save() {
    const body: VaultEntryWriteRequest = { ...f, title: f.title.trim(), email: f.email || null, username: f.username || null, url: f.url || null, password: f.password || null, notes: f.notes || null };
    if (await runner.run(() => (id ? api.vault.updateEntry(id, body) : api.vault.createEntry(body)))) await onChanged();
  }

  if (id && !e && !loaded.error) return <Sheet title="Entry" onClose={onClose}><Muted>Loading…</Muted></Sheet>;

  return (
    <Sheet title={id ? (editing ? 'Edit entry' : f.title) : 'New entry'} onClose={onClose}>
      {loaded.error ? <ErrorNote message={loaded.error} /> : null}
      {!editing && e ? (
        <>
          {e.username ? <CopyRow label="Username" value={e.username} copied={copied === 'u'} onCopy={() => void copy(e.username!, 'u')} /> : null}
          {e.email ? <CopyRow label="Email" value={e.email} copied={copied === 'e'} onCopy={() => void copy(e.email!, 'e')} /> : null}
          {e.password !== null ? <CopyRow label="Password" value={show ? e.password ?? '' : '•'.repeat(Math.max(8, e.password?.length ?? 8))} copied={copied === 'p'} onCopy={() => void copy(e.password ?? '', 'p')} extra={<Btn kind="ghost" label={show ? 'Hide' : 'Show'} onPress={() => setShow(!show)} style={{ paddingVertical: 4, paddingHorizontal: 8 }} />} /> : null}
          {e.url ? <CopyRow label="Website" value={e.url} copied={copied === 'w'} onCopy={() => void copy(e.url!, 'w')} /> : null}
          {e.notes ? <View style={{ marginVertical: 8 }}><Muted>Notes</Muted><Text style={s.body}>{e.notes}</Text></View> : null}
          {copied ? <Muted style={{ fontSize: 11 }}>Copied. The clipboard clears itself in 30 seconds.</Muted> : null}
          <View style={{ gap: 10, marginTop: 12 }}>
            <Btn label="Edit" onPress={() => setEditing(true)} />
            <Btn kind="danger" label="Delete" onPress={() => void runner.run(() => api.vault.deleteEntry(e.id), onChanged)} />
          </View>
        </>
      ) : (
        <>
          <Field label="Type"><Chips value={f.type} onChange={(v) => v && set({ type: v as VaultEntryType })} options={opts(['LOGIN', 'CARD', 'NOTE'] as const)} /></Field>
          <Field label="Title"><Input value={f.title} onChangeText={(v) => set({ title: v })} /></Field>
          <Field label="Username"><Input value={f.username ?? ''} onChangeText={(v) => set({ username: v })} autoCapitalize="none" autoCorrect={false} /></Field>
          <Field label="Email"><Input value={f.email ?? ''} onChangeText={(v) => set({ email: v })} autoCapitalize="none" keyboardType="email-address" /></Field>
          <Field label="Password">
            <Input value={f.password ?? ''} onChangeText={(v) => set({ password: v })} autoCapitalize="none" autoCorrect={false} secureTextEntry={!show} />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
              <Btn kind="ghost" label="Generate" onPress={() => set({ password: generatePassword(DEFAULT_GENERATOR, randomInt) })} style={{ paddingVertical: 6 }} />
              <Btn kind="ghost" label={show ? 'Hide' : 'Show'} onPress={() => setShow(!show)} style={{ paddingVertical: 6 }} />
            </View>
          </Field>
          <Field label="Website"><Input value={f.url ?? ''} onChangeText={(v) => set({ url: v })} autoCapitalize="none" keyboardType="url" /></Field>
          <Field label="Notes"><Input value={f.notes ?? ''} onChangeText={(v) => set({ notes: v })} multiline style={{ minHeight: 70 }} /></Field>
          <Field label="Folder"><Chips value={f.categoryId ?? ''} onChange={(v) => set({ categoryId: v || null })} clearable options={categories.map((c) => ({ value: c.id, label: c.name }))} /></Field>
          <Field label="Expires"><DateInput value={f.expiresAt?.slice(0, 10) ?? ''} onChange={(v) => set({ expiresAt: v || null })} /></Field>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}><Text style={s.body}>Favorite</Text><Switch value={!!f.favorite} onValueChange={(v) => set({ favorite: v })} trackColor={{ true: C.accent }} /></View>
          {runner.error ? <ErrorNote message={runner.error} /> : null}
          <Btn label="Save" disabled={!f.title.trim() || runner.busy} onPress={() => void save()} />
        </>
      )}
    </Sheet>
  );
}

function CopyRow({ label, value, onCopy, copied, extra }: { label: string; value: string; onCopy: () => void; copied: boolean; extra?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 6, gap: 8 }}>
      <View style={{ flex: 1 }}><Muted style={{ fontSize: 11 }}>{label}</Muted><Text style={s.body} numberOfLines={2}>{value}</Text></View>
      {extra}
      <Btn kind="ghost" label={copied ? 'Copied' : 'Copy'} onPress={onCopy} style={{ paddingVertical: 4, paddingHorizontal: 10 }} />
    </View>
  );
}

// ------------------------------------------------------------------ health
export function HealthTab() {
  const api = useApi();
  const health = useAsync(() => api.vault.health(), api);
  const h = health.data;
  return (
    <>
      {health.error && !h ? <ErrorNote message={health.error} onRetry={health.reload} /> : null}
      <Panel title="Vault health">
        <Progress label="Security score" pct={h?.score ?? 0} right={h ? `${Math.round(h.score)}/100` : '—'} color={(h?.score ?? 0) >= 70 ? C.accent : C.gold} />
        <StatGrid>
          <Stat label="Entries" value={h?.totalCount ?? '—'} />
          <Stat label="Weak" value={h?.weakCount ?? '—'} />
          <Stat label="Reused" value={h?.duplicateCount ?? '—'} />
          <Stat label="Compromised" value={h?.compromisedCount ?? '—'} />
        </StatGrid>
      </Panel>
      <Panel title="Password age">{h?.ageBuckets.length ? <Bars rows={h.ageBuckets.map((b) => ({ label: b.label, value: b.count }))} /> : <Empty>No data yet.</Empty>}</Panel>
      <Panel title="Action required">{h?.actionRequired.length ? h.actionRequired.map((a) => <Row key={a.id}><View style={{ flex: 1 }}><Text style={s.body}>{a.title}</Text><Muted style={{ fontSize: 12 }}>{a.issue}</Muted></View></Row>) : <Empty>Nothing to fix.</Empty>}</Panel>
    </>
  );
}

// ------------------------------------------------------------------ cards
export function CardsTab() {
  const api = useApi();
  const runner = useRunner();
  const cards = useAsync(() => api.vault.cards(), api);
  const [adding, setAdding] = useState(false);
  return (
    <>
      <Btn label="+ Add card" onPress={() => setAdding(true)} style={{ marginBottom: 12 }} />
      {cards.error && !cards.data ? <ErrorNote message={cards.error} onRetry={cards.reload} /> : null}
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      <Panel title={`${cards.data?.length ?? 0} cards`}>
        {cards.data?.length === 0 ? <Empty>No cards saved.</Empty> : cards.data?.map((c: VaultCard) => (
          <Row key={c.id}>
            <View style={{ flex: 1 }}><Text style={[s.body, { fontWeight: '700' }]}>{c.nickname}</Text><Muted style={{ fontSize: 12 }}>{c.network} · {maskCard(c)}</Muted><Muted style={{ fontSize: 11 }}>{c.cardHolderName} · expires {c.expiry}</Muted></View>
            <Btn kind="danger" label="Delete" onPress={() => void runner.run(() => api.vault.deleteCard(c.id), cards.reload)} style={{ paddingVertical: 5, paddingHorizontal: 10 }} />
          </Row>
        ))}
      </Panel>
      {adding ? <CardSheet onClose={() => setAdding(false)} onSaved={async () => { setAdding(false); await cards.reload(); }} /> : null}
    </>
  );
}

function CardSheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => Promise<void> }) {
  const api = useApi();
  const runner = useRunner();
  const [f, setF] = useState({ nickname: '', network: 'VISA' as ApiCardNetwork, cardNumber: '', cvv: '', expiry: '', cardHolderName: '', billingZip: '' });
  const set = (patch: Partial<typeof f>) => setF({ ...f, ...patch });
  return (
    <Sheet title="Add a card" onClose={onClose}>
      <Field label="Nickname"><Input value={f.nickname} onChangeText={(v) => set({ nickname: v })} /></Field>
      <Field label="Network"><Chips value={f.network} onChange={(v) => v && set({ network: v })} options={CARD_NETWORKS.map((n) => ({ value: n, label: n }))} /></Field>
      <Field label="Card number"><Input value={f.cardNumber} onChangeText={(v) => set({ cardNumber: v.replace(/[^\d ]/g, '') })} keyboardType="number-pad" /></Field>
      <Field label="Expiry (MM/YY)"><Input value={f.expiry} onChangeText={(v) => set({ expiry: v })} placeholder="08/29" /></Field>
      <Field label="CVV"><Input value={f.cvv} onChangeText={(v) => set({ cvv: v.replace(/\D/g, '') })} keyboardType="number-pad" secureTextEntry /></Field>
      <Field label="Name on card"><Input value={f.cardHolderName} onChangeText={(v) => set({ cardHolderName: v })} /></Field>
      <Field label="Billing ZIP / PIN"><Input value={f.billingZip} onChangeText={(v) => set({ billingZip: v })} /></Field>
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      <Btn label="Save card" disabled={runner.busy || !f.nickname.trim() || f.cardNumber.replace(/\D/g, '').length < 12 || f.cvv.length < 3 || !f.expiry.trim()} onPress={() => void runner.run(() => api.vault.createCard({ ...f, cardNumber: f.cardNumber.replace(/\D/g, '') }), onSaved)} />
    </Sheet>
  );
}

// ------------------------------------------------------------------ security
export function SecurityTab() {
  const api = useApi();
  const runner = useRunner();
  const status = useAsync(() => api.vault.status(), api);
  const codes = useAsync(() => api.vault.recoveryCodes(), api);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [fresh, setFresh] = useState<string[] | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const { copy } = useCopy();
  return (
    <>
      <Panel title="Master password">
        <Muted style={{ marginBottom: 8 }}>Strength: {status.data?.masterPasswordStrength?.replace('_', ' ').toLowerCase() ?? '—'}{status.data?.masterPasswordUpdatedAt ? ` · changed ${status.data.masterPasswordUpdatedAt.slice(0, 10)}` : ''}</Muted>
        <Field label="Current"><Input value={current} onChangeText={setCurrent} secureTextEntry autoCapitalize="none" /></Field>
        <Field label="New"><Input value={next} onChangeText={setNext} secureTextEntry autoCapitalize="none" /></Field>
        {runner.error ? <ErrorNote message={runner.error} /> : null}
        {done ? <Muted style={{ marginBottom: 8 }}>{done}</Muted> : null}
        <Btn label="Change master password" disabled={runner.busy || !current || next.length < 8} onPress={() => void runner.run(() => api.vault.changeMasterPassword(current, next), async () => { setCurrent(''); setNext(''); setDone('Master password changed.'); await status.reload(); })} />
      </Panel>
      <Panel title="Recovery codes">
        <Muted style={{ marginBottom: 8 }}>One-time codes that let you reset the master password if you forget it. Generating new ones replaces the old.</Muted>
        {codes.data?.length ? codes.data.map((c) => <Row key={c.id}><Text style={s.body}>Code from {c.createdAt.slice(0, 10)}</Text><Pill label={c.used ? 'Used' : 'Unused'} color={c.used ? C.muted : C.accent} /></Row>) : <Empty>No codes yet.</Empty>}
        <Btn kind="ghost" label="Generate new codes" disabled={!current || runner.busy} onPress={() => void runner.run(() => api.vault.generateRecoveryCodes(current), undefined).then((r) => { if (r) { setFresh(r.codes); void codes.reload(); } })} style={{ marginTop: 10 }} />
        <Muted style={{ fontSize: 11, marginTop: 4 }}>Enter your current master password above first.</Muted>
      </Panel>
      {fresh ? (
        <Sheet title="Your recovery codes" onClose={() => setFresh(null)}>
          <Muted style={{ marginBottom: 8 }}>Save these now. They are shown only once.</Muted>
          {fresh.map((c) => <Text key={c} style={[s.body, { fontFamily: 'monospace', marginVertical: 2 }]}>{c}</Text>)}
          <Btn label="Copy all" onPress={() => void copy(fresh.join('\n'), 'codes')} style={{ marginTop: 12 }} />
        </Sheet>
      ) : null}
    </>
  );
}

// ------------------------------------------------------------------ audit log
export function AuditTab() {
  const api = useApi();
  const [page, setPage] = useState(0);
  const events = useAsync(() => api.audit.events(page, 50), page);
  const r = events.data;
  return (
    <>
      {events.error && !r ? <ErrorNote message={events.error} onRetry={events.reload} /> : null}
      <Panel title={`${r?.totalElements ?? 0} events`}>
        {r?.content.length === 0 ? <Empty>Nothing recorded yet.</Empty> : r?.content.map((e) => (
          <Row key={e.eventId}>
            <View style={{ flex: 1 }}><Text style={s.body}>{e.description}</Text><Muted style={{ fontSize: 11 }}>{e.eventType.replace(/_/g, ' ').toLowerCase()} · {e.service}</Muted></View>
            <Muted style={{ fontSize: 11 }}>{e.occurredAt.slice(5, 16).replace('T', ' ')}</Muted>
          </Row>
        ))}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
          <Btn kind="ghost" label="‹ Newer" disabled={page === 0} onPress={() => setPage(page - 1)} style={{ paddingVertical: 7 }} />
          <Muted>Page {page + 1} of {Math.max(1, r?.totalPages ?? 1)}</Muted>
          <Btn kind="ghost" label="Older ›" disabled={!r || r.last} onPress={() => setPage(page + 1)} style={{ paddingVertical: 7 }} />
        </View>
      </Panel>
    </>
  );
}

// ------------------------------------------------------------------ data
export function DataTab() {
  const api = useApi();
  const runner = useRunner();
  const backup = useAsync(() => api.audit.latestBackup(), api);
  const [csv, setCsv] = useState('');
  const [result, setResult] = useState<string | null>(null);

  async function exportAll() {
    const data = await api.vault.exportAll();
    await Share.share({ message: JSON.stringify(data, null, 2), title: 'Life OS vault export' });
  }

  async function importCsv() {
    const rows = parseCsv(csv);
    if (rows.length < 2) { setResult('Paste a CSV with a header row and at least one entry.'); return; }
    const head = rows[0].map((h) => h.trim().toLowerCase());
    const col = (...names: string[]) => head.findIndex((h) => names.includes(h));
    const [iName, iUrl, iUser, iPass, iNote] = [col('name', 'title'), col('url', 'website'), col('username', 'login'), col('password'), col('note', 'notes')];
    if (iName < 0 || iPass < 0) { setResult('The CSV needs "name" and "password" columns.'); return; }
    let ok = 0;
    for (const r of rows.slice(1)) {
      const body: VaultEntrySummary & never = undefined as never;
      void body;
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
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      <Panel title="Export">
        <Muted style={{ marginBottom: 8 }}>Shares a JSON file of every entry, passwords included. Keep it somewhere safe and delete it after use.</Muted>
        <Btn kind="ghost" label="Export vault" disabled={runner.busy} onPress={() => void runner.run(exportAll)} />
      </Panel>
      <Panel title="Import from CSV">
        <Muted style={{ marginBottom: 8 }}>Paste a CSV from another password manager. Columns: name, url, username, password, notes.</Muted>
        <Input value={csv} onChangeText={setCsv} multiline style={{ minHeight: 120 }} autoCapitalize="none" autoCorrect={false} placeholder="name,url,username,password,notes" />
        {result ? <Muted style={{ marginTop: 6 }}>{result}</Muted> : null}
        <Btn label="Import" disabled={!csv.trim() || runner.busy} onPress={() => void runner.run(importCsv)} style={{ marginTop: 10 }} />
      </Panel>
      <Panel title="Backup">
        <Muted style={{ marginBottom: 8 }}>{backup.data ? `Latest backup: ${backup.data.createdAt.slice(0, 16).replace('T', ' ')}` : 'No backup yet.'}</Muted>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Btn label="Back up now" disabled={runner.busy} onPress={() => void runner.run(() => api.audit.runBackup(), backup.reload)} />
          <Btn kind="ghost" label="Restore latest" disabled={runner.busy || !backup.data} onPress={() => void runner.run(() => api.audit.restoreBackup(), backup.reload)} />
        </View>
      </Panel>
    </>
  );
}
