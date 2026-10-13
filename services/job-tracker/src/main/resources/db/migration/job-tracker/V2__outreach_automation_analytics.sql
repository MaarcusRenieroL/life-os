-- Phase 2-6: multi-channel outreach, follow-up automation, in-app
-- notifications, and inbound/outbound email threading.

alter table job_tracker_schema.job_listings
  add column recruiter_email varchar(320),
  add column ingested_by varchar(20) not null default 'MANUAL'
    check (ingested_by in ('MANUAL', 'SCRAPER', 'EMAIL'));

alter table job_tracker_schema.resumes
  add column source_instruction text;

-- ---------------------------------------------------------------------------
-- outreach_attempts: one row per channel touch per application
-- ---------------------------------------------------------------------------
create table job_tracker_schema.outreach_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  application_id uuid not null references job_tracker_schema.applications (id) on delete cascade,
  channel varchar(20) not null
    check (channel in ('ONLINE_FORM', 'COLD_EMAIL', 'LINKEDIN', 'REFERRAL')),
  recipient varchar(500),
  subject varchar(500),
  message_body text,
  status varchar(20) not null default 'PENDING'
    check (status in ('PENDING', 'SCHEDULED', 'SENT', 'FAILED', 'SKIPPED')),
  scheduled_for timestamptz,
  sent_at timestamptz,
  opened boolean not null default false,
  clicked boolean not null default false,
  replied boolean not null default false,
  response_date timestamptz,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_outreach_attempts_application on job_tracker_schema.outreach_attempts (application_id);
create index idx_outreach_attempts_user_status on job_tracker_schema.outreach_attempts (user_id, status);
create index idx_outreach_attempts_scheduled on job_tracker_schema.outreach_attempts (scheduled_for)
  where status = 'SCHEDULED';

-- ---------------------------------------------------------------------------
-- follow_up_tasks: auto-generated + manual reminders
-- ---------------------------------------------------------------------------
create table job_tracker_schema.follow_up_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  application_id uuid references job_tracker_schema.applications (id) on delete cascade,
  type varchar(30) not null
    check (type in ('APPLICATION_FOLLOW_UP', 'RECRUITER_FOLLOW_UP', 'INTERVIEW_THANK_YOU',
                    'INTERVIEW_FEEDBACK', 'REFERRAL_FOLLOW_UP', 'INTERVIEW_PREP', 'CUSTOM')),
  title varchar(500) not null,
  due_date timestamptz not null,
  status varchar(15) not null default 'OPEN'
    check (status in ('OPEN', 'DONE', 'DISMISSED')),
  priority varchar(10) not null default 'MEDIUM'
    check (priority in ('LOW', 'MEDIUM', 'HIGH')),
  notes text,
  notified boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_follow_up_tasks_user_status_due
  on job_tracker_schema.follow_up_tasks (user_id, status, due_date);
create index idx_follow_up_tasks_application on job_tracker_schema.follow_up_tasks (application_id);

-- ---------------------------------------------------------------------------
-- notifications: in-app feed (polled; WebSocket push is a later add)
-- ---------------------------------------------------------------------------
create table job_tracker_schema.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type varchar(40) not null,
  title varchar(500) not null,
  body text,
  related_entity_type varchar(30),
  related_entity_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_notifications_user_read_created
  on job_tracker_schema.notifications (user_id, is_read, created_at desc);

-- ---------------------------------------------------------------------------
-- email_messages: inbound (Gmail) + outbound threading per application
-- ---------------------------------------------------------------------------
create table job_tracker_schema.email_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  application_id uuid references job_tracker_schema.applications (id) on delete set null,
  direction varchar(10) not null check (direction in ('INBOUND', 'OUTBOUND')),
  external_message_id varchar(500),
  thread_id varchar(500),
  from_address varchar(320),
  to_address varchar(320),
  subject varchar(1000),
  body text,
  category varchar(25) not null default 'OTHER'
    check (category in ('RECRUITER_OUTREACH', 'INTERVIEW_INVITE', 'REJECTION',
                        'CONFIRMATION', 'OFFER', 'OTHER')),
  received_at timestamptz,
  parsed_json jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, external_message_id)
);

create index idx_email_messages_application on job_tracker_schema.email_messages (application_id);
create index idx_email_messages_user_thread on job_tracker_schema.email_messages (user_id, thread_id);
