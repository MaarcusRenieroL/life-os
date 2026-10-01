-- The resume parser has always extracted education and achievements from an uploaded resume, but
-- career_profiles never had columns to keep them - they were parsed and immediately discarded,
-- which is why every tailored resume silently dropped those sections regardless of what the
-- candidate's actual resume said.
ALTER TABLE job_tracker_schema.career_profiles
  ADD COLUMN education_json JSONB,
  ADD COLUMN achievements_json JSONB;
