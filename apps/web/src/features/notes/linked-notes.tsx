import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

import { notesApi } from './notes-api';
import type { NoteModuleType } from './types';

interface Props {
  moduleType: NoteModuleType;
  moduleId: string;
  /** Seeds the title of a note created via "+ New note" here. */
  defaultTitle: string;
}

/** Cross-module "attach notes to X" integration point, shared by the tasks and calendar forms
 * (and any future module) rather than reimplemented per module - reads/writes through notes'
 * existing module-link mechanism (NoteModuleType/NoteModuleLink on the backend), which already
 * reserved TASK and now EVENT for exactly this. */
export function LinkedNotes({ moduleType, moduleId, defaultTitle }: Props) {
  const queryClient = useQueryClient();
  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['notes', 'by-module', moduleType, moduleId],
    queryFn: () => notesApi.byModule(moduleType, moduleId),
  });

  async function createLinkedNote() {
    try {
      await notesApi.create({
        title: `${defaultTitle} — notes`,
        moduleLinks: [{ moduleType, moduleId }],
      });
      queryClient.invalidateQueries({ queryKey: ['notes', 'by-module', moduleType, moduleId] });
    } catch {
      toast.error('Could not create a linked note. Please try again.');
    }
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium">Notes</span>
        <Button size="sm" variant="ghost" onClick={() => void createLinkedNote()}>
          <Plus className="size-3.5" /> New note
        </Button>
      </div>
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : notes.length === 0 ? (
        <p className="text-xs text-muted-foreground">No notes linked yet.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {notes.map((note) => (
            <li key={note.id} className="rounded border p-2 text-xs">
              <Link to={`/notes/${note.id}`} className="font-medium hover:underline" target="_blank" rel="noreferrer">
                {note.title}
              </Link>
              {note.description && <p className="mt-0.5 line-clamp-2 text-muted-foreground">{note.description.slice(0, 100)}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
