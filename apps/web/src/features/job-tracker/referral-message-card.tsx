import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { jobApi } from './job-api';
import type { KnownPerson } from './types';

/**
 * Who you know at this company, and the standard referral ask ready to send them.
 *
 * The people are kept per company, so a name noted on one role is there on every other role at the
 * same company. Picking a person greets them by first name in the message. The message itself is
 * built on the server from a fixed template, so it is on screen the moment the page opens.
 */
export function ReferralMessageCard({ jobId, company }: { jobId: string; company: string }) {
  const queryClient = useQueryClient();
  const [contactName, setContactName] = useState('');
  const [copied, setCopied] = useState(false);
  const [newName, setNewName] = useState('');
  const [newNote, setNewNote] = useState('');

  const peopleKey = ['jobs', jobId, 'known-people'];
  const { data: people = [] } = useQuery({
    queryKey: peopleKey,
    queryFn: () => jobApi.knownPeople(jobId),
  });

  const savePeople = useMutation({
    mutationFn: (next: KnownPerson[]) => jobApi.saveKnownPeople(jobId, next),
    onSuccess: (saved) => queryClient.setQueryData(peopleKey, saved),
    onError: () => toast.error('Could not save that. Try again.'),
  });

  // Keyed on the name so the greeting updates as it is typed; placeholderData keeps the previous
  // text on screen between keystrokes instead of flashing empty.
  const { data: message, isError } = useQuery({
    queryKey: ['jobs', jobId, 'referral-message', contactName.trim()],
    queryFn: () => jobApi.referralMessage(jobId, contactName.trim() || undefined),
    placeholderData: (previous) => previous,
    staleTime: 30_000,
  });

  function addPerson() {
    const name = newName.trim();
    if (!name) return;
    savePeople.mutate([...people, { name, note: newNote.trim() || null }]);
    setContactName(name);
    setNewName('');
    setNewNote('');
  }

  function removePerson(person: KnownPerson) {
    savePeople.mutate(people.filter((p) => p !== person));
    if (contactName === person.name) setContactName('');
  }

  async function copy() {
    if (!message) return;
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success('Referral message copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy - select the text and copy it manually');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">
          {people.length === 0
            ? `Anyone you know at ${company}? Note them here - they're the best people to ask first.`
            : `People you know at ${company}. Pick one to address the message to them.`}
        </p>

        {people.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {people.map((person) => {
              const selected = contactName === person.name;
              return (
                <li
                  key={`${person.name}-${person.note ?? ''}`}
                  className={`flex items-center gap-1 rounded-full border py-1 pr-1 pl-3 text-sm ${selected ? 'border-primary bg-primary/10' : ''}`}
                >
                  <button
                    type="button"
                    className="text-left"
                    onClick={() => setContactName(selected ? '' : person.name)}
                    title={selected ? 'Click to stop addressing them' : 'Address the message to them'}
                  >
                    <span className="font-medium">{person.name}</span>
                    {person.note && <span className="text-muted-foreground"> · {person.note}</span>}
                  </button>
                  <button
                    type="button"
                    className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={`Remove ${person.name}`}
                    onClick={() => removePerson(person)}
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addPerson();
          }}
        >
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name"
            className="h-8 w-40"
          />
          <Input
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="How you know them (optional)"
            className="h-8 min-w-48 flex-1"
          />
          <Button type="submit" size="sm" variant="outline" disabled={!newName.trim() || savePeople.isPending}>
            <Plus className="size-4" /> Add
          </Button>
        </form>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {contactName ? `Addressed to ${contactName.split(' ')[0]}` : 'Not addressed to anyone yet'}
          </p>
          <Button size="sm" onClick={() => void copy()} disabled={!message}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? 'Copied' : 'Copy message'}
          </Button>
        </div>

        {isError && <p className="text-sm text-destructive">Could not build the message. Reload and try again.</p>}

        {message && (
          <pre className="rounded-md border bg-muted/30 p-4 font-sans text-sm leading-relaxed break-words whitespace-pre-wrap">
            {message}
          </pre>
        )}
      </div>
    </div>
  );
}
