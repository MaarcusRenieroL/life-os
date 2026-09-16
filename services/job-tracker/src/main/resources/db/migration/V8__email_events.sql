-- Tracks Gmail messages the batches service has forwarded for job-tracking automation:
-- job-alert digests (auto-create listings) and application/interview/rejection/offer
-- emails (auto-advance or flag a status change). One row per Gmail message.

create table job_tracker_schema.email_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  gmail_message_id varchar(255) not null,
  from_address varchar(320) not null,
  subject text,
  snippet text,
  detected_type varchar(30) not null
    check (detected_type in (
      'JOB_ALERT_DIGEST', 'APPLICATION_CONFIRMATION', 'INTERVIEW_INVITE', 'REJECTION', 'OFFER', 'UNRELATED'
    )),
  confidence varchar(10) not null check (confidence in ('HIGH', 'MEDIUM', 'LOW')),
  matched_job_id uuid references job_tracker_schema.job_listings(id) on delete set null,
  suggested_status varchar(30),
  created_jobs_count integer not null default 0,
  status varchar(30) not null default 'NEEDS_REVIEW'
    check (status in ('APPLIED_AUTOMATICALLY', 'NEEDS_REVIEW', 'IGNORED', 'DISMISSED')),
  created_at timestamptz not null default now(),

  unique (user_id, gmail_message_id)
);

create index idx_email_events_user_status on job_tracker_schema.email_events (user_id, status);
