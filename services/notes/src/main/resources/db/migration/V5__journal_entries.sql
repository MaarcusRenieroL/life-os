-- Journal entries are notes (note_type JOURNAL, tagged "journal") plus this one-to-one row of
-- journal-only fields. The note's own content is the rendered write-up (prompt answers followed by
-- free writing) so search, export, the graph and the generic notes list all keep working; this
-- table keeps the structured source it's rendered from.

alter table notes_schema.notes
  drop constraint notes_note_type_check;

alter table notes_schema.notes
  add constraint notes_note_type_check
  check (note_type in ('GENERAL', 'MEETING', 'BOOK', 'LEARNING', 'TECHNICAL', 'SNIPPET', 'RESEARCH', 'CHECKLIST', 'TRAVEL', 'DECISION', 'JOURNAL'));

create table notes_schema.journal_entries (
  note_id uuid primary key references notes_schema.notes (id) on delete cascade,
  entry_date date not null,
  mood integer check (mood between 1 and 5),
  energy integer check (energy between 1 and 5),
  free_writing text,
  -- [{"prompt": "...", "answer": "..."}] in the order they were written
  prompt_answers jsonb not null default '[]'::jsonb
);

create index idx_journal_entries_entry_date on notes_schema.journal_entries (entry_date);
