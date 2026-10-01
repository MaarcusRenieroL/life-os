-- The tailoring prompt has always instructed Claude not to fabricate skills/experience, but
-- nothing checked that programmatically (unlike link fabrication, which is already caught in
-- code). This adds a column to hold skill names the post-tailoring diff finds in the output but
-- not in the resume/skill list it was tailored from - flagged for the candidate to review, not
-- silently blocked.
ALTER TABLE job_tracker_schema.job_listings
  ADD COLUMN fabrication_flags_json JSONB;

ALTER TABLE job_tracker_schema.job_tailoring_versions
  ADD COLUMN fabrication_flags_json JSONB;
