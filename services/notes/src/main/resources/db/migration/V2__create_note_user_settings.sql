create table notes_schema.note_user_settings (
  user_id uuid primary key,
  default_note_type varchar(20) not null default 'GENERAL'
    check (default_note_type in ('GENERAL', 'MEETING', 'BOOK', 'LEARNING', 'TECHNICAL', 'SNIPPET', 'RESEARCH', 'CHECKLIST', 'TRAVEL', 'DECISION')),
  auto_archive_enabled boolean not null default false,
  auto_archive_days integer not null default 90,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
