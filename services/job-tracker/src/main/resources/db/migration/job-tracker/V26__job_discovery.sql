-- Job discovery: watch company career boards, diff them daily, score new openings against the
-- candidate's skill library, and hold them in an inbox until promoted into the real pipeline.
--
-- Discovered jobs live in their own table on purpose: a scan can surface thousands of openings and
-- they must not flood job_listings (dashboard, analytics, follow-up scanners). Promoting one
-- creates a job_listings row.

create table job_tracker_schema.watched_companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name varchar(300) not null,
  board varchar(20) not null
    check (board in ('GREENHOUSE', 'LEVER', 'ASHBY', 'WORKABLE', 'WORKDAY', 'ORACLE')),
  slug varchar(300) not null,
  domain varchar(300),
  alert boolean not null default true,
  active boolean not null default true,
  -- null until the first successful scan. That first scan is a baseline: every posting looks new,
  -- so none of them raise a notification.
  baselined_at timestamptz,
  last_fetched_at timestamptz,
  last_fetch_error varchar(500),
  last_open_count integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create index idx_watched_companies_user_id on job_tracker_schema.watched_companies (user_id);
create index idx_watched_companies_active on job_tracker_schema.watched_companies (active)
  where active;

create table job_tracker_schema.discovered_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  watched_company_id uuid not null
    references job_tracker_schema.watched_companies (id) on delete cascade,
  -- board:slug:board-native-id, stable across title/URL edits.
  external_id varchar(400) not null,
  company varchar(300) not null,
  title varchar(500) not null,
  url varchar(2000),
  location varchar(500),
  description text,
  posted_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  closed_at timestamptz,
  fit_score integer,
  fit_explanation_json jsonb,
  status varchar(20) not null default 'NEW'
    check (status in ('NEW', 'DISMISSED', 'PROMOTED')),
  promoted_job_id uuid,
  alerted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, external_id)
);

create index idx_discovered_jobs_inbox
  on job_tracker_schema.discovered_jobs (user_id, status, fit_score desc)
  where closed_at is null;
create index idx_discovered_jobs_company on job_tracker_schema.discovered_jobs (watched_company_id);

create table job_tracker_schema.discovery_preferences (
  user_id uuid primary key,
  title_include_json jsonb not null default '[]'::jsonb,
  title_exclude_json jsonb not null default '[]'::jsonb,
  locations_json jsonb not null default '[]'::jsonb,
  -- null = infer from the skill library's years of experience
  max_seniority varchar(20)
    check (max_seniority is null
      or max_seniority in ('INTERN', 'JUNIOR', 'MID', 'SENIOR', 'STAFF', 'LEAD', 'PRINCIPAL')),
  alert_min_score integer not null default 60,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Provenance for jobs created by promoting a discovery hit.
alter table job_tracker_schema.job_listings add column if not exists discovered_job_id uuid;
