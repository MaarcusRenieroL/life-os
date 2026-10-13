-- Phase 1: interview tracking. One row per interview round for a job, with AI-generated prep
-- topics and space for the candidate's own notes on how it went.

create table job_tracker_schema.interviews (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references job_tracker_schema.job_listings(id) on delete cascade,
  user_id uuid not null,
  round_type varchar(30) not null check (round_type in (
    'RECRUITER_SCREENING',
    'CODING_ASSESSMENT',
    'TECHNICAL',
    'SYSTEM_DESIGN',
    'HIRING_MANAGER',
    'HR_DISCUSSION'
  )),
  scheduled_at timestamptz,
  interviewer_name text,
  meeting_link text,
  topics_json jsonb,
  preparation_notes text,
  questions_asked text,
  performance_notes text,
  result varchar(20) check (result in ('PENDING', 'PASSED', 'FAILED', 'CANCELLED')) default 'PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index interviews_job_id_idx on job_tracker_schema.interviews(job_id);
create index interviews_user_id_idx on job_tracker_schema.interviews(user_id);
