alter table notes_schema.notes
  add column follow_up_at timestamptz;

create index idx_notes_follow_up_at on notes_schema.notes (follow_up_at)
  where follow_up_at is not null;
