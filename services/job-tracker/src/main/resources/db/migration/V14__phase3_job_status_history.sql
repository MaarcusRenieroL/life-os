-- Phase 3: analytics. Logs every pipeline stage transition so we can compute average time spent
-- in each stage - something the job_listings table alone can't answer since it only holds the
-- current status, not the history of how it got there.

create table job_tracker_schema.job_status_history (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references job_tracker_schema.job_listings(id) on delete cascade,
  user_id uuid not null,
  from_status varchar(30),
  to_status varchar(30) not null,
  changed_at timestamptz not null default now()
);

create index job_status_history_job_id_idx on job_tracker_schema.job_status_history(job_id);
create index job_status_history_user_id_idx on job_tracker_schema.job_status_history(user_id);

-- Backfill one synthetic entry per existing job so history isn't empty for jobs created before
-- this table existed - a null-to-current-status row, timestamped at job creation.
insert into job_tracker_schema.job_status_history (job_id, user_id, from_status, to_status, changed_at)
select id, user_id, null, status, created_at
from job_tracker_schema.job_listings
where status is not null;
