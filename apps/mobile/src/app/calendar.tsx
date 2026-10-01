import { dayKey, EVENT_CATEGORIES, shiftDay, type CalendarEvent, type EventCategory } from '@life-os/core';
import { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { Text } from '@/text';

import { Btn, Chips, DateInput, Empty, Field, Input, opts, Pill, Row, Screen, Seg, Sheet } from '@/kit';
import { useApi } from '@/lib/session';
import { useAsync, useRunner } from '@/lib/use-async';
import { C } from '@/theme';
import { ErrorNote, Muted, Panel, s } from '@/ui';

type Mode = 'month' | 'agenda' | 'free';
const MODES = [{ id: 'month', label: 'Month' }, { id: 'agenda', label: 'Agenda' }, { id: 'free', label: 'Free time' }] as const;
const eventDay = (e: CalendarEvent) => e.startDate ?? (e.startAt ? dayKey(new Date(e.startAt)) : '');
const timeOf = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');

export default function Calendar() {
  const api = useApi();
  const [mode, setMode] = useState<Mode>('month');
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [selected, setSelected] = useState(dayKey(new Date()));
  const [editing, setEditing] = useState<{ event: CalendarEvent | null; date: string } | null>(null);

  const offset = (cursor.getDay() + 6) % 7;
  const gridStart = dayKey(new Date(cursor.getFullYear(), cursor.getMonth(), 1 - offset));
  const gridEnd = shiftDay(gridStart, 41);
  const events = useAsync(() => api.calendar.list(gridStart, gridEnd), gridStart);
  const list = events.data ?? [];
  const today = dayKey(new Date());
  const shift = (n: number) => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1));
  const dayEvents = (day: string) => list.filter((e) => eventDay(e) === day).sort((a, b) => (a.startAt ?? '').localeCompare(b.startAt ?? ''));

  const eventRow = (e: CalendarEvent) => (
    <Row key={e.id} onPress={() => setEditing({ event: e, date: eventDay(e) })}>
      <Muted style={{ width: 84 }}>{e.allDay ? 'All day' : `${timeOf(e.startAt)}\n${timeOf(e.endAt)}`}</Muted>
      <View style={{ flex: 1 }}><Text style={s.body}>{e.title}</Text>{e.location ? <Muted style={{ fontSize: 11 }}>{e.location}</Muted> : null}</View>
      <Pill label={e.category} color={C.cyan} />
    </Row>
  );

  return (
    <Screen title="Calendar" back={false} onRefresh={() => void events.reload()} refreshing={events.loading} action={<Btn label="+ Event" onPress={() => setEditing({ event: null, date: selected })} style={{ paddingVertical: 7 }} />}>
      <Seg tabs={MODES} value={mode} onChange={setMode} />
      {events.error && !events.data ? <ErrorNote message={events.error} onRetry={events.reload} /> : null}
      {mode !== 'free' ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <Pressable hitSlop={12} onPress={() => shift(-1)}><Text style={{ color: C.accent, fontSize: 24 }}>‹</Text></Pressable>
          <Text style={[s.h2, { fontSize: 17 }]}>{cursor.toLocaleDateString([], { month: 'long', year: 'numeric' })}</Text>
          <Pressable hitSlop={12} onPress={() => shift(1)}><Text style={{ color: C.accent, fontSize: 24 }}>›</Text></Pressable>
        </View>
      ) : null}

      {mode === 'month' ? (
        <>
          <View style={{ flexDirection: 'row' }}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <Text key={i} style={{ flex: 1, textAlign: 'center', color: C.muted, fontSize: 11, marginBottom: 6 }}>{d}</Text>)}</View>
          {Array.from({ length: 6 }, (_, w) => (
            <View key={w} style={{ flexDirection: 'row' }}>
              {Array.from({ length: 7 }, (_, d) => {
                const day = shiftDay(gridStart, w * 7 + d);
                const count = dayEvents(day).length;
                const inMonth = day.slice(0, 7) === dayKey(cursor).slice(0, 7);
                const sel = day === selected;
                return (
                  <Pressable key={day} onPress={() => setSelected(day)} style={{ flex: 1, alignItems: 'center', paddingVertical: 8, margin: 1, borderRadius: 6, borderWidth: 1, borderColor: sel ? C.accent : day === today ? C.line : 'transparent', backgroundColor: sel ? '#4fcb6f24' : 'transparent' }}>
                    <Text style={{ color: inMonth ? C.text : C.line, fontWeight: day === today ? '800' : '400' }}>{Number(day.slice(8))}</Text>
                    <View style={{ height: 6, flexDirection: 'row', gap: 2, marginTop: 3 }}>{Array.from({ length: Math.min(count, 3) }, (_, i) => <View key={i} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: C.cyan }} />)}</View>
                  </Pressable>
                );
              })}
            </View>
          ))}
          <Panel title={new Date(`${selected}T12:00:00`).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })} style={{ marginTop: 12 }}>
            {dayEvents(selected).length === 0 ? <Empty>Nothing planned.</Empty> : dayEvents(selected).map(eventRow)}
          </Panel>
        </>
      ) : null}

      {mode === 'agenda' ? (() => {
        const upcoming = list.filter((e) => eventDay(e) >= today).sort((a, b) => (a.startAt ?? a.startDate ?? '').localeCompare(b.startAt ?? b.startDate ?? ''));
        const days = [...new Set(upcoming.map(eventDay))];
        return upcoming.length === 0 ? <Panel><Empty>No upcoming events in view.</Empty></Panel> : days.map((d) => <Panel key={d} title={new Date(`${d}T12:00:00`).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}>{upcoming.filter((e) => eventDay(e) === d).map(eventRow)}</Panel>);
      })() : null}

      {mode === 'free' ? <FreeTime /> : null}
      {editing ? <EventSheet event={editing.event} date={editing.date} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await events.reload(); }} /> : null}
    </Screen>
  );
}

function FreeTime() {
  const api = useApi();
  const [date, setDate] = useState(dayKey(new Date()));
  const [min, setMin] = useState('30');
  const slots = useAsync(() => api.calendar.freeSlots(date, Number(min) || 30), `${date}|${min}`);
  return (
    <Panel title="Free time">
      <Field label="Day"><DateInput value={date} onChange={setDate} /></Field>
      <Field label="At least (minutes)"><Input value={min} onChangeText={setMin} keyboardType="numeric" /></Field>
      {slots.error ? <ErrorNote message={slots.error} /> : null}
      {(slots.data ?? []).length === 0 && !slots.loading ? <Empty>No free slots that long.</Empty> : (slots.data ?? []).map((sl) => <Row key={sl.startAt}><Text style={s.body}>{timeOf(sl.startAt)} – {timeOf(sl.endAt)}</Text><Pill label={`${sl.durationMinutes} min`} color={C.accent} /></Row>)}
    </Panel>
  );
}

function EventSheet({ event, date, onClose, onSaved }: { event: CalendarEvent | null; date: string; onClose: () => void; onSaved: () => Promise<void> }) {
  const api = useApi();
  const runner = useRunner();
  const hhmm = (iso: string | null, fallback: string) => (iso ? new Date(iso).toTimeString().slice(0, 5) : fallback);
  const [title, setTitle] = useState(event?.title ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [location, setLocation] = useState(event?.location ?? '');
  const [category, setCategory] = useState<EventCategory>(event?.category ?? 'PERSONAL');
  const [allDay, setAllDay] = useState(event?.allDay ?? false);
  const [day, setDay] = useState(event ? eventDay(event) || date : date);
  const [start, setStart] = useState(hhmm(event?.startAt ?? null, '09:00'));
  const [end, setEnd] = useState(hhmm(event?.endAt ?? null, '10:00'));
  const validTime = (t: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
  const timesOk = allDay || (validTime(start) && validTime(end) && end > start);

  async function save() {
    const common = { title: title.trim(), description: description.trim() || null, location: location.trim() || null, category };
    const body = allDay
      ? { ...common, allDay: true, startDate: day, endDate: day, startAt: null, endAt: null }
      : { ...common, allDay: false, startAt: new Date(`${day}T${start}`).toISOString(), endAt: new Date(`${day}T${end}`).toISOString(), startDate: null, endDate: null };
    if (await runner.run(() => (event ? api.calendar.update(event.id, body) : api.calendar.create(body)))) await onSaved();
  }

  return (
    <Sheet title={event ? 'Edit event' : 'New event'} onClose={onClose}>
      <Field label="Title"><Input value={title} onChangeText={setTitle} autoFocus={!event} /></Field>
      <Field label="Day"><DateInput value={day} onChange={setDay} /></Field>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}><Text style={{ color: C.text }}>All day</Text><Switch value={allDay} onValueChange={setAllDay} trackColor={{ true: C.accent }} /></View>
      {!allDay ? <View style={{ flexDirection: 'row', gap: 10 }}><View style={{ flex: 1 }}><Field label="Starts (HH:MM)"><Input value={start} onChangeText={setStart} keyboardType="numbers-and-punctuation" maxLength={5} /></Field></View><View style={{ flex: 1 }}><Field label="Ends (HH:MM)"><Input value={end} onChangeText={setEnd} keyboardType="numbers-and-punctuation" maxLength={5} /></Field></View></View> : null}
      <Field label="Category"><Chips value={category} onChange={(v) => v && setCategory(v)} options={opts(EVENT_CATEGORIES)} /></Field>
      <Field label="Location"><Input value={location} onChangeText={setLocation} /></Field>
      <Field label="Notes"><Input value={description} onChangeText={setDescription} multiline /></Field>
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      <View style={{ gap: 10 }}>
        <Btn label={event ? 'Save' : 'Create'} disabled={!title.trim() || !timesOk || runner.busy} onPress={() => void save()} />
        {event ? <Btn kind="ghost" label="Duplicate" onPress={() => void runner.run(() => api.calendar.duplicate(event.id), onSaved)} /> : null}
        {event ? <Btn kind="danger" label="Delete" onPress={() => void runner.run(() => api.calendar.remove(event.id), onSaved)} /> : null}
      </View>
    </Sheet>
  );
}
