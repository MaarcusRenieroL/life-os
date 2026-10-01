-- Lets a candidate upload a one-off resume for a single job (e.g. one built with a different
-- tool) and score that job against it specifically, instead of the persisted skill library or
-- this job's own AI-tailored resume.
ALTER TABLE job_tracker_schema.job_listings
  ADD COLUMN override_resume_text TEXT,
  ADD COLUMN override_resume_file_name VARCHAR(300),
  ADD COLUMN override_resume_uploaded_at TIMESTAMPTZ;
