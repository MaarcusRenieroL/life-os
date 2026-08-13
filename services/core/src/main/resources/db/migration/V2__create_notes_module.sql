-- Notes module: notes, folders, tags, links, module links, attachments,
-- templates, versions. Full-text search is a generated tsvector column on
-- notes (title weighted A, content weighted B) instead of the separate
-- note_search_index denormalization table from the original spec - Postgres
-- generated columns give the same query-time behaviour without a second
-- table to keep in sync.

create table core_schema.note_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  parent_folder_id uuid references core_schema.note_folders (id) on delete cascade,
  name varchar(500) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, parent_folder_id, name)
);

create index idx_note_folders_user_id on core_schema.note_folders (user_id);
create index idx_note_folders_parent on core_schema.note_folders (parent_folder_id);

create table core_schema.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  parent_note_id uuid references core_schema.notes (id) on delete set null,
  title varchar(500) not null,
  content text,
  content_plain_text text,
  description varchar(1000),
  is_pinned boolean not null default false,
  is_archived boolean not null default false,
  is_favorite boolean not null default false,
  note_type varchar(20) not null default 'GENERAL'
    check (note_type in ('GENERAL', 'MEETING', 'BOOK', 'LEARNING', 'TECHNICAL', 'SNIPPET', 'RESEARCH', 'CHECKLIST', 'TRAVEL', 'DECISION')),
  content_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content_plain_text, '')), 'B')
  ) stored
);

create index idx_notes_user_id on core_schema.notes (user_id);
create index idx_notes_user_created on core_schema.notes (user_id, created_at);
create index idx_notes_user_updated on core_schema.notes (user_id, updated_at);
create index idx_notes_user_pinned_favorite on core_schema.notes (user_id, is_pinned, is_favorite);
create index idx_notes_parent on core_schema.notes (parent_note_id);
create index idx_notes_search_vector on core_schema.notes using gin (search_vector);

create table core_schema.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name varchar(100) not null,
  color varchar(7),
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index idx_tags_user_id on core_schema.tags (user_id);

create table core_schema.note_tags (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references core_schema.notes (id) on delete cascade,
  tag_id uuid not null references core_schema.tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (note_id, tag_id)
);

create index idx_note_tags_note_id on core_schema.note_tags (note_id);
create index idx_note_tags_tag_id on core_schema.note_tags (tag_id);

create table core_schema.note_folder_assignment (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references core_schema.notes (id) on delete cascade,
  folder_id uuid not null references core_schema.note_folders (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (note_id, folder_id)
);

create index idx_note_folder_assignment_note_id on core_schema.note_folder_assignment (note_id);
create index idx_note_folder_assignment_folder_id on core_schema.note_folder_assignment (folder_id);

create table core_schema.note_links (
  id uuid primary key default gen_random_uuid(),
  source_note_id uuid not null references core_schema.notes (id) on delete cascade,
  target_note_id uuid not null references core_schema.notes (id) on delete cascade,
  link_type varchar(20) not null default 'INTERNAL_LINK'
    check (link_type in ('INTERNAL_LINK', 'BACKLINK', 'MENTION')),
  created_at timestamptz not null default now(),
  unique (source_note_id, target_note_id),
  check (source_note_id <> target_note_id)
);

create index idx_note_links_source on core_schema.note_links (source_note_id);
create index idx_note_links_target on core_schema.note_links (target_note_id);

create table core_schema.note_module_links (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references core_schema.notes (id) on delete cascade,
  module_type varchar(20) not null
    check (module_type in ('PROJECT', 'GOAL', 'TASK', 'JOB_APPLICATION', 'HABIT')),
  module_id uuid not null,
  created_at timestamptz not null default now(),
  unique (note_id, module_type, module_id)
);

create index idx_note_module_links_note_id on core_schema.note_module_links (note_id);
create index idx_note_module_links_module on core_schema.note_module_links (module_type, module_id);

create table core_schema.note_attachments (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references core_schema.notes (id) on delete cascade,
  file_name varchar(500) not null,
  file_key varchar(500) not null,
  file_size bigint not null,
  file_type varchar(50),
  upload_date timestamptz not null default now(),
  deleted_at timestamptz
);

create index idx_note_attachments_note_id on core_schema.note_attachments (note_id);

create table core_schema.note_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name varchar(500) not null,
  content text,
  category varchar(100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_note_templates_user_id on core_schema.note_templates (user_id);

create table core_schema.note_versions (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references core_schema.notes (id) on delete cascade,
  version_number integer not null,
  content text,
  content_plain_text text,
  created_at timestamptz not null default now(),
  created_by uuid,
  unique (note_id, version_number)
);

create index idx_note_versions_note_id on core_schema.note_versions (note_id);
