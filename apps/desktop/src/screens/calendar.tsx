import { dayKey, EVENT_CATEGORIES, shiftDay, type CalendarEvent, type EventCategory } from '@life-os/core';
import { useState, type FormEvent } from 'react';

import { useApi } from '../lib/session';
import { useAsync, useRunner } from '../lib/use-async';
import { Empty, ErrorNote, Field, Modal, opts, Panel, Select, Tabs } from '../ui';

type Mode = 'month' | 'week' | 'day' | 'agenda' | 'free';
const MODES = [
  { id: 'month', label: 'Month' },
  { id: 'week', label: 'Week' },
  { id: 'day', label: 'Day' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'free', label: 'Free time' },
] as const;
const monday = (iso: string) => { const d = new Date(`${iso}T12:00:00`); return dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7))); };
const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const eventDay = (e: CalendarEvent) => e.startDate ?? (e.startAt ? dayKey(new Date(e.startAt)) : '');
const timeOf = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');

export function CalendarScreen() {
  const api = useApi();
  const [mode, setMode] = useState<Mode>('month');
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [selected, setSelected] = useState(dayKey(new Date()));
  const [editing, setEditing] = useState<{ event: CalendarEvent | null; date: string } | null>(null);

  // Month grid starts on Monday and always shows six weeks.
  const first = new Date(cursor);
  const offset = (first.getDay() + 6) % 7;
  const gridStart = dayKey(new Date(first.getFullYear(), first.getMonth(), 1 - offset));
  const gridEnd = shiftDay(gridStart, 41);
  const events = useAsync(() => api.calendar.list(gridStart, gridEnd), [api, gridStart]);
  const list = events.data ?? [];
  const today = dayKey(new Date());
  const monthLabel = cursor.toLocaleDateString([], { month: 'long', year: 'numeric' });
  const shift = (n: number) => {
    if (mode === 'week' || mode === 'day') {
      const next = shiftDay(selected, n * (mode === 'week' ? 7 : 1));
      setSelected(next);
      const d = new Date(`${next}T12:00:00`);
      setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
    } else setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1));
  };
  const dayEvents = (day: string) => list.filter((e) => eventDay(e) === day).sort((a, b) => (a.startAt ?? '').localeCompare(b.startAt ?? ''));
  const label = mode === 'week' ? `${monday(selected)} → ${shiftDay(monday(selected), 6)}` : mode === 'day' ? new Date(`${selected}T12:00:00`).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }) : monthLabel;

  return (
    <div className="stack">
      <div className="row">
        <Tabs tabs={MODES} value={mode} onChange={setMode} />
        <div className="actions">
          <button className="ghost" onClick={() => shift(-1)}>‹</button>
          <b style={{ minWidth: 190, textAlign: 'center' }}>{label}</b>
          <button className="ghost" onClick={() => shift(1)}>›</button>
          <button className="ghost" onClick={() => { const d = new Date(); d.setDate(1); setCursor(d); setSelected(dayKey(new Date())); }}>Today</button>
          <button className="primary" onClick={() => setEditing({ event: null, date: today })}>+ Event</button>
        </div>
      </div>
      {events.error && !events.data && <ErrorNote message={events.error} onRetry={events.reload} />}

      {mode === 'month' && (
        <div className="cal">
          {WEEKDAYS.map((d) => <div key={d} className="cal-head">{d}</div>)}
          {Array.from({ length: 42 }, (_, i) => {
            const day = shiftDay(gridStart, i);
            const dayEvents = list.filter((e) => eventDay(e) === day);
            return (
              <div key={day} className={`cal-cell${day.slice(0, 7) !== dayKey(cursor).slice(0, 7) ? ' off' : ''}${day === today ? ' today' : ''}`} onClick={() => setEditing({ event: null, date: day })}>
                <b>{Number(day.slice(8))}</b>
                {dayEvents.slice(0, 3).map((e) => <button key={e.id} className="ev" onClick={(ev) => { ev.stopPropagation(); setEditing({ event: e, date: day }); }}>{e.allDay ? '' : `${timeOf(e.startAt)} `}{e.title}</button>)}
                {dayEvents.length > 3 && <small className="muted">+{dayEvents.length - 3} more</small>}
              </div>
            );
          })}
        </div>
      )}

      {mode === 'week' && Array.from({ length: 7 }, (_, i) => shiftDay(monday(selected), i)).map((d) => (
        <Panel key={d} title={`${new Date(`${d}T12:00:00`).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}${d === today ? ' · today' : ''}`} accent={d === today ? 'var(--accent)' : undefined}>
          {dayEvents(d).length === 0 ? <Empty>Free.</Empty> : <ul className="list">{dayEvents(d).map((e) => <li key={e.id} className="clickable" onClick={() => setEditing({ event: e, date: d })}><small className="muted" style={{ width: 90 }}>{e.allDay ? 'All day' : `${timeOf(e.startAt)}–${timeOf(e.endAt)}`}</small><span className="grow">{e.title}{e.location && <small className="muted"> · {e.location}</small>}</span><span className="pill">{e.category.toLowerCase()}</span></li>)}</ul>}
        </Panel>
      ))}
      {mode === 'day' && (
        <Panel title={`${dayEvents(selected).length} events`}>
          {dayEvents(selected).length === 0 ? <Empty>Nothing planned.</Empty> : <ul className="list">{dayEvents(selected).map((e) => <li key={e.id} className="clickable" onClick={() => setEditing({ event: e, date: selected })}><small className="muted" style={{ width: 90 }}>{e.allDay ? 'All day' : `${timeOf(e.startAt)}–${timeOf(e.endAt)}`}</small><span className="grow">{e.title}{e.location && <small className="muted"> · {e.location}</small>}</span><span className="pill">{e.category.toLowerCase()}</span></li>)}</ul>}
        </Panel>
      )}
      {mode === 'agenda' && <Agenda events={list.filter((e) => eventDay(e) >= today).sort((a, b) => (a.startAt ?? a.startDate ?? '').localeCompare(b.startAt ?? b.startDate ?? ''))} onOpen={(e) => setEditing({ event: e, date: eventDay(e) })} />}
      {mode === 'free' && <FreeTime />}

      {editing && <EventEditor event={editing.event} date={editing.date} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await events.reload(); }} />}
    </div>
  );
}

function Agenda({ events, onOpen }: { events: CalendarEvent[]; onOpen: (e: CalendarEvent) => void }) {
  const days = [...new Set(events.map(eventDay))];
  if (events.length === 0) return <Panel><Empty>No upcoming events in view.</Empty></Panel>;
  return (
    <>
      {days.map((day) => (
        <Panel key={day} title={new Date(day + 'T12:00:00').toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}>
          <ul className="list">{events.filter((e) => eventDay(e) === day).map((e) => (
            <li key={e.id} className="clickable" onClick={() => onOpen(e)}>
              <small className="muted" style={{ width: 90 }}>{e.allDay ? 'All day' : `${timeOf(e.startAt)}–${timeOf(e.endAt)}`}</small>
              <span className="grow">{e.title}{e.location && <small className="muted"> · {e.location}</small>}</span><span className="pill">{e.category.toLowerCase()}</span>
            </li>
          ))}</ul>
        </Panel>
      ))}
    </>
  );
}

function FreeTime() {
  const api = useApi();
  const [date, setDate] = useState(dayKey(new Date()));
  const [min, setMin] = useState('30');
  const slots = useAsync(() => api.calendar.freeSlots(date, Number(min) || 30), [api, date, min]);
  return (
    <Panel title="Free time">
      <div className="cols"><Field label="Day"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field><Field label="At least (minutes)"><input type="number" value={min} onChange={(e) => setMin(e.target.value)} /></Field></div>
      {slots.error && <ErrorNote message={slots.error} />}
      {(slots.data ?? []).length === 0 && !slots.loading ? <Empty>No free slots that long.</Empty> : <ul className="list">{(slots.data ?? []).map((s) => <li key={s.startAt}><span className="grow">{timeOf(s.startAt)} – {timeOf(s.endAt)}</span><span className="pill good">{s.durationMinutes} min</span></li>)}</ul>}
    </Panel>
  );
}

function EventEditor({ event, date, onClose, onSaved }: { event: CalendarEvent | null; date: string; onClose: () => void; onSaved: () => Promise<void> }) {
  const api = useApi();
  const runner = useRunner();
  const localTime = (iso: string | null, fallback: string) => (iso ? new Date(iso).toTimeString().slice(0, 5) : fallback);
  const [title, setTitle] = useState(event?.title ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [location, setLocation] = useState(event?.location ?? '');
  const [category, setCategory] = useState<EventCategory>(event?.category ?? 'PERSONAL');
  const [allDay, setAllDay] = useState(event?.allDay ?? false);
  const [day, setDay] = useState(event ? eventDay(event) || date : date);
  const [start, setStart] = useState(localTime(event?.startAt ?? null, '09:00'));
  const [end, setEnd] = useState(localTime(event?.endAt ?? null, '10:00'));

  async function save(e: FormEvent) {
    e.preventDefault();
    const body = allDay
      ? { title: title.trim(), description: description.trim() || null, location: location.trim() || null, category, allDay: true, startDate: day, endDate: day, startAt: null, endAt: null }
      : { title: title.trim(), description: description.trim() || null, location: location.trim() || null, category, allDay: false, startAt: new Date(`${day}T${start}`).toISOString(), endAt: new Date(`${day}T${end}`).toISOString(), startDate: null, endDate: null };
    if (await runner.run(() => (event ? api.calendar.update(event.id, body) : api.calendar.create(body)))) await onSaved();
  }

  return (
    <Modal title={event ? 'Edit event' : 'New event'} onClose={onClose}>
      <form className="stack" onSubmit={save}>
        <Field label="Title"><input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <div className="cols">
          <Field label="Day"><input type="date" value={day} onChange={(e) => setDay(e.target.value)} /></Field>
          <Field label="Category"><Select value={category} onChange={(v) => v && setCategory(v)} options={opts(EVENT_CATEGORIES)} /></Field>
          {!allDay && <><Field label="Starts"><input type="time" value={start} onChange={(e) => setStart(e.target.value)} /></Field><Field label="Ends"><input type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></Field></>}
        </div>
        <label className="row" style={{ justifyContent: 'flex-start' }}><input type="checkbox" style={{ width: 'auto' }} checked={allDay} onChange={(e) => setAllDay(e.target.checked)} /> All day</label>
        <Field label="Location"><input value={location} onChange={(e) => setLocation(e.target.value)} /></Field>
        <Field label="Notes"><textarea value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        {runner.error && <ErrorNote message={runner.error} />}
        <div className="actions">
          {event && <button type="button" className="ghost" onClick={() => void runner.run(() => api.calendar.duplicate(event.id), onSaved)}>Duplicate</button>}
          {event && <button type="button" className="danger" onClick={() => void runner.run(() => api.calendar.remove(event.id), onSaved)}>Delete</button>}
          <button className="primary" disabled={!title.trim() || runner.busy || (!allDay && end <= start)}>{event ? 'Save' : 'Create'}</button>
        </div>
      </form>
    </Modal>
  );
}
