import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft, Sparkles, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { useConfirmDialog } from '@/components/confirm-dialog';
import { DatePicker } from '@/components/date-time-picker';
import { SearchableSelect } from '@/components/searchable-select';
import { SectionHeading } from '@/components/section-heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { goalsApi } from '@/features/goals/goals-api';
import { projectsApi } from '@/features/tasks/projects-goals-api';
import { getErrorMessage } from '@/lib/error';

import { journalApi } from './journal-api';
import type { JournalEntry, JournalPrompt } from './journal-types';
import { RatingPicker } from './mood-picker';

interface PromptRow {
  prompt: string;
  answer: string;
}

interface LinkRow {
  moduleType: 'GOAL' | 'PROJECT';
  moduleId: string;
}

const today = () => format(new Date(), 'yyyy-MM-dd');

/** Write or edit a journal entry: date, mood and energy, any prompts you want to answer, and free
 * writing. Structured prompts and free writing are kept apart and rendered into the note's content
 * server-side, so the entry still shows up in notes search and export. */
export function JournalEditorPage() {
  const { noteId } = useParams();
  const editing = noteId !== undefined && noteId !== 'new';

  const { data: existing, isLoading } = useQuery({
    queryKey: ['notes', 'journal', 'entry', noteId],
    queryFn: () => journalApi.get(noteId!),
    enabled: editing,
  });

  if (editing && isLoading) return <Skeleton className="h-96 w-full" />;
  if (editing && !existing) {
    return (
      <div>
        <p className="text-sm text-muted-foreground">This entry couldn’t be found.</p>
        <Button variant="link" className="px-0" asChild>
          <Link to="/notes/journal">Back to the journal</Link>
        </Button>
      </div>
    );
  }
  // Keyed so opening a different entry (or "new") starts from fresh form state.
  return <JournalForm key={existing?.noteId ?? 'new'} existing={existing ?? null} />;
}

function JournalForm({ existing }: { existing: JournalEntry | null }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { confirm, dialog } = useConfirmDialog();

  const [title, setTitle] = useState(existing?.title ?? '');
  const [date, setDate] = useState<string | null>(existing?.entryDate ?? today());
  const [mood, setMood] = useState<number | null>(existing?.mood ?? null);
  const [energy, setEnergy] = useState<number | null>(existing?.energy ?? null);
  const [freeWriting, setFreeWriting] = useState(existing?.freeWriting ?? '');
  const [prompts, setPrompts] = useState<PromptRow[]>(existing?.prompts ?? []);
  const [links, setLinks] = useState<LinkRow[]>(existing?.links.filter((l) => l.moduleType === 'GOAL' || l.moduleType === 'PROJECT').map((l) => ({ moduleType: l.moduleType as 'GOAL' | 'PROJECT', moduleId: l.moduleId })) ?? []);
  const [saving, setSaving] = useState(false);

  const { data: suggested = [] } = useQuery({ queryKey: ['notes', 'journal', 'suggested', date], queryFn: () => journalApi.suggestedPrompts(date ?? undefined) });
  const { data: library = [] } = useQuery({ queryKey: ['notes', 'journal', 'prompts'], queryFn: journalApi.prompts, staleTime: Infinity });
  const { data: goals = [] } = useQuery({ queryKey: ['goals', 'list', { forJournal: true }], queryFn: () => goalsApi.list({ includeArchived: true }) });
  const { data: projects = [] } = useQuery({ queryKey: ['tasks', 'projects'], queryFn: projectsApi.list });

  const used = new Set(prompts.map((p) => p.prompt));
  const availableSuggestions = suggested.filter((p) => !used.has(p.text));
  const libraryOptions = library.filter((p) => !used.has(p.text)).map((p) => ({ id: p.id, label: `${p.category}: ${p.text}` }));

  const linkOptions = [
    ...goals.map((g) => ({ id: `GOAL:${g.id}`, label: `Goal: ${g.name}` })),
    ...projects.map((p) => ({ id: `PROJECT:${p.id}`, label: `Project: ${p.name}` })),
  ].filter((o) => !links.some((l) => `${l.moduleType}:${l.moduleId}` === o.id));

  function labelFor(link: LinkRow): string {
    if (link.moduleType === 'GOAL') return goals.find((g) => g.id === link.moduleId)?.name ?? 'Goal';
    return projects.find((p) => p.id === link.moduleId)?.name ?? 'Project';
  }

  function addPrompt(prompt: JournalPrompt) {
    setPrompts([...prompts, { prompt: prompt.text, answer: '' }]);
  }

  const hasContent = freeWriting.trim() !== '' || prompts.some((p) => p.answer.trim() !== '') || mood != null || energy != null;

  async function save() {
    setSaving(true);
    try {
      const request = {
        title: title.trim() || null,
        entryDate: date,
        mood,
        energy,
        freeWriting: freeWriting.trim() || null,
        prompts: prompts.filter((p) => p.answer.trim() !== ''),
        links,
      };
      if (existing) await journalApi.update(existing.noteId, request);
      else await journalApi.create(request);
      void queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success(existing ? 'Entry updated' : 'Entry saved');
      navigate('/notes/journal');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save the entry. Please try again.'));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!existing) return;
    if (!(await confirm({ title: 'Move this entry to the trash?', description: 'You can restore it from the notes trash.', confirmLabel: 'Move to trash' }))) return;
    try {
      await journalApi.delete(existing.noteId);
      void queryClient.invalidateQueries({ queryKey: ['notes'] });
      navigate('/notes/journal');
    } catch {
      toast.error('Could not delete the entry. Please try again.');
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 pb-10">
      <div>
        <Link to="/notes/journal" className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Journal
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{existing ? 'Edit entry' : 'New entry'}</h1>
          {existing && (
            <Button variant="ghost" className="text-destructive" onClick={() => void remove()}>
              <Trash2 /> Delete
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Date</Label>
          <DatePicker value={date} onChange={setDate} placeholder="Today" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="journal-title">Title</Label>
          <Input id="journal-title" value={title} maxLength={500} onChange={(e) => setTitle(e.target.value)} placeholder="Defaults to the date" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Mood</Label>
          <RatingPicker kind="mood" value={mood} onChange={setMood} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Energy</Label>
          <RatingPicker kind="energy" value={energy} onChange={setEnergy} />
        </div>
      </div>

      <section>
        <SectionHeading className="mb-3">prompts</SectionHeading>
        {prompts.length > 0 && (
          <div className="mb-3 flex flex-col gap-3">
            {prompts.map((row, index) => (
              <Card key={row.prompt}>
                <CardContent className="py-3">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <Label htmlFor={`prompt-${index}`} className="mb-0 leading-snug">
                      {row.prompt}
                    </Label>
                    <Button size="icon" variant="ghost" aria-label={`Remove prompt: ${row.prompt}`} onClick={() => setPrompts(prompts.filter((_, i) => i !== index))}>
                      <X className="size-4" />
                    </Button>
                  </div>
                  <Textarea
                    id={`prompt-${index}`}
                    rows={3}
                    value={row.answer}
                    onChange={(e) => setPrompts(prompts.map((p, i) => (i === index ? { ...p, answer: e.target.value } : p)))}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {availableSuggestions.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {availableSuggestions.map((p) => (
              <Button key={p.id} size="sm" variant="outline" className="h-auto whitespace-normal py-1.5 text-left" onClick={() => addPrompt(p)}>
                <Sparkles /> {p.text}
              </Button>
            ))}
          </div>
        )}
        <div className="max-w-md">
          <SearchableSelect
            options={libraryOptions}
            value={null}
            onChange={(id) => {
              const prompt = library.find((p) => p.id === id);
              if (prompt) addPrompt(prompt);
            }}
            placeholder="Browse all prompts…"
            searchPlaceholder="Search prompts…"
          />
        </div>
      </section>

      <section className="flex flex-col gap-1.5">
        <SectionHeading className="mb-1">free writing</SectionHeading>
        <Textarea
          aria-label="Free writing"
          rows={10}
          value={freeWriting}
          onChange={(e) => setFreeWriting(e.target.value)}
          placeholder="Whatever's on your mind…"
        />
      </section>

      <section>
        <SectionHeading className="mb-3">linked goals & projects</SectionHeading>
        {links.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {links.map((link) => (
              <span key={`${link.moduleType}:${link.moduleId}`} className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs">
                {link.moduleType === 'GOAL' ? 'Goal' : 'Project'}: {labelFor(link)}
                <button type="button" aria-label={`Unlink ${labelFor(link)}`} onClick={() => setLinks(links.filter((l) => l !== link))}>
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="max-w-md">
          <SearchableSelect
            options={linkOptions}
            value={null}
            onChange={(id) => {
              if (!id) return;
              const [moduleType, moduleId] = id.split(':') as ['GOAL' | 'PROJECT', string];
              setLinks([...links, { moduleType, moduleId }]);
            }}
            placeholder="Link a goal or project…"
            searchPlaceholder="Search…"
          />
        </div>
      </section>

      <div className="flex gap-2 border-t pt-4">
        <Button onClick={() => void save()} disabled={saving || !hasContent}>
          {saving ? 'Saving…' : existing ? 'Save changes' : 'Save entry'}
        </Button>
        <Button variant="outline" asChild>
          <Link to="/notes/journal">
            Cancel
          </Link>
        </Button>
      </div>
      {dialog}
    </div>
  );
}
