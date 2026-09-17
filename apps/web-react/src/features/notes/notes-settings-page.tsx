import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { SectionHeading } from '@/components/section-heading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';

import { notesApi } from './notes-api';
import { noteSettingsApi } from './settings-api';
import { templatesApi } from './templates-api';
import type { NoteType } from './types';
import { NOTE_TYPE_LIST } from './utils/note-type-meta';
import { relativeTime } from './utils/relative-time';

export function NotesSettingsPage() {
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ['notes', 'settings'], queryFn: noteSettingsApi.get });
  const { data: templatePage } = useQuery({ queryKey: ['notes', 'templates'], queryFn: () => templatesApi.list() });
  const { data: trash = [] } = useQuery({ queryKey: ['notes', 'trash'], queryFn: notesApi.trash });

  const [autoArchiveDays, setAutoArchiveDays] = useState(settings?.autoArchiveDays ?? 90);

  function invalidateSettings() {
    queryClient.invalidateQueries({ queryKey: ['notes', 'settings'] });
  }

  async function setDefaultType(type: NoteType) {
    await noteSettingsApi.update({ defaultNoteType: type });
    invalidateSettings();
  }

  async function toggleAutoArchive(enabled: boolean) {
    await noteSettingsApi.update({ autoArchiveEnabled: enabled });
    invalidateSettings();
  }

  async function saveAutoArchiveDays() {
    await noteSettingsApi.update({ autoArchiveDays: Math.min(3650, Math.max(1, autoArchiveDays)) });
    invalidateSettings();
  }

  async function restoreNote(id: string) {
    await notesApi.restore(id);
    queryClient.invalidateQueries({ queryKey: ['notes', 'trash'] });
  }

  async function permanentlyDelete(id: string) {
    if (!confirm('Permanently delete this note? This cannot be undone.')) return;
    await notesApi.permanentlyDelete(id);
    queryClient.invalidateQueries({ queryKey: ['notes', 'trash'] });
  }

  async function deleteAllData() {
    if (!confirm("This permanently deletes every note, folder, tag, and template. Attachments and version history go with them. This cannot be undone.\n\nType nothing to cancel, OK to confirm.")) return;
    await noteSettingsApi.deleteAllData();
    queryClient.invalidateQueries({ queryKey: ['notes'] });
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Notes settings</h1>

      <section className="mt-6 rounded-lg border bg-card p-5">
        <SectionHeading>Default note type</SectionHeading>
        <RadioGroup
          value={settings?.defaultNoteType}
          onValueChange={(v) => void setDefaultType(v as NoteType)}
          className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3"
        >
          {NOTE_TYPE_LIST.map((t) => (
            <Label key={t.value} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
              <RadioGroupItem value={t.value} />
              {t.label}
            </Label>
          ))}
        </RadioGroup>
      </section>

      <section className="mt-4 rounded-lg border bg-card p-5">
        <div className="flex items-center justify-between">
          <SectionHeading>Auto-archive</SectionHeading>
          <Switch checked={settings?.autoArchiveEnabled ?? false} onCheckedChange={(v) => void toggleAutoArchive(v)} />
        </div>
        {settings?.autoArchiveEnabled && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Archive after</span>
            <Input
              type="number"
              min={1}
              max={3650}
              value={autoArchiveDays}
              onChange={(e) => setAutoArchiveDays(Number(e.target.value))}
              onBlur={() => void saveAutoArchiveDays()}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">days of inactivity</span>
          </div>
        )}
      </section>

      <section className="mt-4 rounded-lg border bg-card p-5">
        <SectionHeading>Templates</SectionHeading>
        <p className="mt-1 text-sm text-muted-foreground">
          {templatePage?.totalElements ?? 0} templates —{' '}
          <Link to="/notes/templates" className="text-primary hover:underline">manage them</Link>
        </p>
      </section>

      <section className="mt-4 rounded-lg border bg-card p-5">
        <SectionHeading>Export all notes</SectionHeading>
        <div className="mt-2 flex gap-2 text-xs">
          <a className="text-primary hover:underline" href={noteSettingsApi.exportAllUrl('markdown')}>Markdown (.zip)</a>
          <a className="text-primary hover:underline" href={noteSettingsApi.exportAllUrl('pdf')}>PDF (.zip)</a>
          <a className="text-primary hover:underline" href={noteSettingsApi.exportAllUrl('json')}>JSON</a>
        </div>
      </section>

      <section className="mt-4 rounded-lg border bg-card p-5">
        <SectionHeading>Trash</SectionHeading>
        <p className="mt-1 text-[11px] text-muted-foreground">Emptied automatically after 30 days.</p>
        <ul className="mt-2 flex flex-col gap-1.5">
          {trash.map((t) => (
            <li key={t.id} className="flex items-center justify-between text-sm">
              <span>{t.title} <span className="text-xs text-muted-foreground">· deleted {relativeTime(t.deletedAt)}</span></span>
              <div className="flex gap-2 text-xs">
                <button className="text-primary hover:underline" onClick={() => void restoreNote(t.id)}>Restore</button>
                <button className="text-destructive hover:underline" onClick={() => void permanentlyDelete(t.id)}>Delete forever</button>
              </div>
            </li>
          ))}
          {trash.length === 0 && <p className="text-sm text-muted-foreground">Trash is empty.</p>}
        </ul>
      </section>

      <section className="mt-4 rounded-lg border border-destructive/35 bg-card p-5">
        <SectionHeading tone="destructive">Danger zone</SectionHeading>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Permanently deletes every note, folder, tag, and template. Attachments and version history go with
          them. This cannot be undone.
        </p>
        <Button variant="outline" className="mt-3 border-destructive/50 text-destructive hover:bg-destructive/10" onClick={() => void deleteAllData()}>
          I'm sure, delete everything
        </Button>
      </section>
    </div>
  );
}
