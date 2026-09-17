-- Job Tracker module - Phase 1 MVP schema.
--
-- 12 tables in job_tracker_schema (the auth `users` table lives in another
-- service's schema, so user_id columns here are plain uuid with no FK, same
-- convention as every other life-os service).
--
-- Deviations from the build spec's field list, all additive:
--   * job_listing.company_id  - nullable FK so "suggest referral contacts at
--     this job's company" can resolve without string-matching company names.
--   * every table gets created_at/updated_at where the spec only named one of
--     them, to match the rest of the codebase.
--   * *_json fields are jsonb.

create schema if not exists job_tracker_schema;

-- ---------------------------------------------------------------------------
-- job_source: where listings come from (LinkedIn, WellFound, manual, ...)
-- ---------------------------------------------------------------------------
create table job_tracker_schema.job_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name varchar(120) not null,
  url varchar(1000),
  scrape_frequency varchar(20) not null default 'MANUAL'
    check (scrape_frequency in ('MANUAL', 'HOURLY', 'DAILY', 'WEEKLY')),
  last_scraped timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create index idx_job_sources_user_id on job_tracker_schema.job_sources (user_id);

-- ---------------------------------------------------------------------------
-- company + contact: the referral network
-- ---------------------------------------------------------------------------
create table job_tracker_schema.companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name varchar(300) not null,
  industry varchar(200),
  size varchar(20)
    check (size is null or size in ('STARTUP', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE')),
  website varchar(1000),
  linkedin_url varchar(1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create index idx_companies_user_id on job_tracker_schema.companies (user_id);

create table job_tracker_schema.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  company_id uuid references job_tracker_schema.companies (id) on delete set null,
  name varchar(300) not null,
  role varchar(300),
  email varchar(320),
  phone varchar(50),
  linkedin_url varchar(1000),
  relationship_type varchar(30) not null default 'OTHER'
    check (relationship_type in ('WORKED_TOGETHER', 'MET_AT_EVENT', 'MUTUAL_CONNECTION',
                                 'RECRUITER', 'HIRING_MANAGER', 'COLD', 'OTHER')),
  is_vip boolean not null default false,
  last_interaction_date timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_contacts_company_user on job_tracker_schema.contacts (company_id, user_id);
create index idx_contacts_user_id on job_tracker_schema.contacts (user_id);

-- ---------------------------------------------------------------------------
-- skill: master skill library per user (extracted from resumes or added)
-- ---------------------------------------------------------------------------
create table job_tracker_schema.skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name varchar(150) not null,
  category varchar(20) not null default 'OTHER'
    check (category in ('LANGUAGE', 'FRAMEWORK', 'PLATFORM', 'DATABASE', 'TOOL', 'SOFT', 'OTHER')),
  proficiency varchar(20) not null default 'INTERMEDIATE'
    check (proficiency in ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT')),
  years_of_experience numeric(4, 1),
  confidence_score numeric(4, 3),
  source varchar(20) not null default 'MANUAL'
    check (source in ('MANUAL', 'RESUME_EXTRACTION')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create index idx_skills_user_name on job_tracker_schema.skills (user_id, name);

-- ---------------------------------------------------------------------------
-- resume: uploaded PDF + Claude-parsed content
-- ---------------------------------------------------------------------------
create table job_tracker_schema.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  label varchar(300),
  file_key varchar(1000) not null,
  file_name varchar(500) not null,
  file_size bigint not null,
  content_type varchar(100) not null default 'application/pdf',
  extraction_status varchar(20) not null default 'PENDING'
    check (extraction_status in ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  extraction_error text,
  raw_text text,
  parsed_json jsonb,
  is_base boolean not null default false,
  tailored_for_application_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_resumes_user_created on job_tracker_schema.resumes (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- job_listing: a scraped or manually entered posting
-- ---------------------------------------------------------------------------
create table job_tracker_schema.job_listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  company_id uuid references job_tracker_schema.companies (id) on delete set null,
  external_id varchar(300),
  title varchar(500) not null,
  company varchar(300) not null,
  location varchar(300),
  work_model varchar(20)
    check (work_model is null or work_model in ('ONSITE', 'HYBRID', 'REMOTE')),
  url varchar(2000),
  job_description_text text,
  source varchar(120),
  salary_min numeric(12, 2),
  salary_max numeric(12, 2),
  currency varchar(3),
  posted_date date,
  deadline date,
  seniority_level varchar(20)
    check (seniority_level is null or seniority_level in ('INTERN', 'JUNIOR', 'MID', 'SENIOR', 'STAFF', 'LEAD', 'PRINCIPAL')),
  required_skills_json jsonb,
  nice_to_have_skills_json jsonb,
  visa_sponsorship varchar(10) not null default 'UNKNOWN'
    check (visa_sponsorship in ('YES', 'NO', 'UNKNOWN')),
  company_size varchar(20)
    check (company_size is null or company_size in ('STARTUP', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE')),
  growth_stage varchar(20)
    check (growth_stage is null or growth_stage in ('STARTUP', 'SCALE_UP', 'ESTABLISHED')),
  industry varchar(200),
  tags_json jsonb,
  parse_status varchar(20) not null default 'PENDING'
    check (parse_status in ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  fit_score integer check (fit_score is null or (fit_score between 0 and 100)),
  fit_explanation_json jsonb,
  is_saved boolean not null default false,
  is_dismissed boolean not null default false,
  scraped_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source, external_id)
);

create index idx_job_listings_user_source_posted
  on job_tracker_schema.job_listings (user_id, source, posted_date desc, salary_min);
create index idx_job_listings_user_score on job_tracker_schema.job_listings (user_id, fit_score desc);
create index idx_job_listings_company on job_tracker_schema.job_listings (company_id);
create unique index uq_job_listings_user_url
  on job_tracker_schema.job_listings (user_id, url) where url is not null;

-- ---------------------------------------------------------------------------
-- application: the user's application to a job_listing
-- ---------------------------------------------------------------------------
create table job_tracker_schema.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  job_listing_id uuid not null references job_tracker_schema.job_listings (id) on delete cascade,
  resume_id uuid references job_tracker_schema.resumes (id) on delete set null,
  status varchar(30) not null default 'Discovered'
    check (status in ('Discovered', 'Saved', 'Applied', 'Recruiter Contacted', 'Screening',
                      'Technical Interview', 'System Design Interview', 'Final Interview',
                      'Offer', 'Rejected', 'Withdrawn')),
  application_method varchar(20)
    check (application_method is null or application_method in ('ONLINE_FORM', 'EMAIL', 'RECRUITER', 'REFERRAL')),
  application_date timestamptz,
  cover_letter_text text,
  custom_message_text text,
  follow_up_reminder_date timestamptz,
  rejection_reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, job_listing_id)
);

create index idx_applications_user_status_date
  on job_tracker_schema.applications (user_id, status, application_date desc);
create index idx_applications_job_listing on job_tracker_schema.applications (job_listing_id);
create index idx_applications_follow_up on job_tracker_schema.applications (follow_up_reminder_date);

-- ---------------------------------------------------------------------------
-- application_status_history: audit trail of status transitions
-- ---------------------------------------------------------------------------
create table job_tracker_schema.application_status_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references job_tracker_schema.applications (id) on delete cascade,
  old_status varchar(30),
  new_status varchar(30) not null,
  note text,
  changed_at timestamptz not null default now(),
  changed_by varchar(20) not null default 'USER'
    check (changed_by in ('USER', 'SYSTEM'))
);

create index idx_application_status_history_application
  on job_tracker_schema.application_status_history (application_id, changed_at desc);

-- ---------------------------------------------------------------------------
-- referral: an outreach to a contact tied to an application
-- ---------------------------------------------------------------------------
create table job_tracker_schema.referrals (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references job_tracker_schema.applications (id) on delete cascade,
  contact_id uuid not null references job_tracker_schema.contacts (id) on delete cascade,
  outreach_date timestamptz,
  message_sent text,
  response_received boolean not null default false,
  response_date timestamptz,
  referral_status varchar(20) not null default 'PENDING'
    check (referral_status in ('PENDING', 'CONTACTED', 'RESPONDED', 'REFERRED', 'DECLINED', 'NO_RESPONSE')),
  follow_up_date timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (application_id, contact_id)
);

create index idx_referrals_application on job_tracker_schema.referrals (application_id);
create index idx_referrals_contact on job_tracker_schema.referrals (contact_id);

-- ---------------------------------------------------------------------------
-- interview_round + interview_prep
-- ---------------------------------------------------------------------------
create table job_tracker_schema.interview_rounds (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references job_tracker_schema.applications (id) on delete cascade,
  type varchar(30) not null default 'PHONE_SCREEN'
    check (type in ('PHONE_SCREEN', 'RECRUITER_CALL', 'CODING', 'SYSTEM_DESIGN',
                    'BEHAVIORAL', 'TAKE_HOME', 'ONSITE', 'FINAL', 'OTHER')),
  scheduled_date timestamptz,
  interviewer_name varchar(300),
  meeting_link varchar(2000),
  duration_minutes integer,
  topics_json jsonb,
  preparation_notes text,
  actual_status varchar(20) not null default 'SCHEDULED'
    check (actual_status in ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW')),
  self_assessment_score integer
    check (self_assessment_score is null or (self_assessment_score between 0 and 10)),
  post_interview_notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_interview_rounds_application on job_tracker_schema.interview_rounds (application_id);
create index idx_interview_rounds_scheduled on job_tracker_schema.interview_rounds (scheduled_date);

create table job_tracker_schema.interview_preps (
  id uuid primary key default gen_random_uuid(),
  interview_round_id uuid not null references job_tracker_schema.interview_rounds (id) on delete cascade,
  title varchar(500) not null,
  description text,
  resource_link varchar(2000),
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_interview_preps_round on job_tracker_schema.interview_preps (interview_round_id);

-- ---------------------------------------------------------------------------
-- offer: linked 1:1 to an application
-- ---------------------------------------------------------------------------
create table job_tracker_schema.offers (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references job_tracker_schema.applications (id) on delete cascade,
  salary numeric(12, 2),
  currency varchar(3),
  benefits_json jsonb,
  start_date date,
  notes text,
  accepted boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_offers_application on job_tracker_schema.offers (application_id);
