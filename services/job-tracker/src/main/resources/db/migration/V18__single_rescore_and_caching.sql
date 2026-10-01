-- Backs the single smart "Re-score" button: which source produced the current score, plus
-- cached AI-extracted skills for the override/tailored resumes so repeat re-scores don't
-- re-invoke the AI (wasteful, and non-deterministic across identical clicks) unless the
-- underlying resume actually changed.
ALTER TABLE job_tracker_schema.job_listings
  ADD COLUMN fit_score_source VARCHAR(20),
  ADD COLUMN override_resume_skills_json JSONB,
  ADD COLUMN tailored_resume_skills_json JSONB;

-- Which resume a given tailoring version was generated from, so history stays legible once the
-- source (global resume vs a job-specific override upload) changes between tailorings.
ALTER TABLE job_tracker_schema.job_tailoring_versions
  ADD COLUMN based_on VARCHAR(20);
