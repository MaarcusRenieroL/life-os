-- Phase 2: referral tracking. One row per contact the candidate is asking for a referral from,
-- with an AI-drafted outreach message the candidate reviews and sends themselves (never sent
-- automatically). Absorbs the "contacted employees" idea from the original Application Tracking
-- spec into its own first-class table.

create table job_tracker_schema.referrals (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references job_tracker_schema.job_listings(id) on delete cascade,
  user_id uuid not null,
  contact_name text not null,
  contact_title text,
  contact_linkedin_url text,
  contact_email text,
  relationship text,
  status varchar(20) not null check (status in (
    'NOT_CONTACTED',
    'MESSAGE_DRAFTED',
    'CONTACTED',
    'RESPONDED',
    'REFERRED',
    'DECLINED'
  )) default 'NOT_CONTACTED',
  draft_message text,
  notes text,
  contacted_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index referrals_job_id_idx on job_tracker_schema.referrals(job_id);
create index referrals_user_id_idx on job_tracker_schema.referrals(user_id);
