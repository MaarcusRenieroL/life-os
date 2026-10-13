-- Each tailor/re-tailor call used to just overwrite job_listings.tailored_*, losing every
-- earlier attempt. Keep them all so the candidate can compare or go back to an older one.

create table job_tracker_schema.job_tailoring_versions (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references job_tracker_schema.job_listings(id) on delete cascade,
  user_id uuid not null,
  version integer not null,
  improvement_points_json jsonb,
  latex_resume text not null,
  fit_score integer,
  created_at timestamptz not null default now(),

  unique (job_id, version)
);

create index idx_job_tailoring_versions_job on job_tracker_schema.job_tailoring_versions (job_id, version desc);
