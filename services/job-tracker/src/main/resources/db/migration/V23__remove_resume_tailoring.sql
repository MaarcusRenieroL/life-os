-- The candidate does not want an AI-generated, rewritten resume/PDF at all - only text
-- suggestions for wording edits to make by hand in their own resume. This removes the whole
-- LaTeX-generation feature (job_tailoring_versions, tailored_*_json/fabrication_flags_json on
-- job_listings) and replaces it with two lightweight suggestion columns.
DROP TABLE job_tracker_schema.job_tailoring_versions;

-- fit_score_source stays (still shared with OVERRIDE_RESUME/LIBRARY) but the app enum no longer
-- has a TAILORED_RESUME value - clear any row still carrying it so it isn't a value nothing maps.
UPDATE job_tracker_schema.job_listings
  SET fit_score_source = NULL
  WHERE fit_score_source = 'TAILORED_RESUME';

ALTER TABLE job_tracker_schema.job_listings
  DROP COLUMN tailored_improvement_points_json,
  DROP COLUMN tailored_gaps_vs_jd_json,
  DROP COLUMN tailored_inferred_claims_json,
  DROP COLUMN tailored_latex_resume,
  DROP COLUMN tailored_resume_skills_json,
  DROP COLUMN fabrication_flags_json,
  ADD COLUMN ats_suggestions_json JSONB,
  ADD COLUMN ats_suggestion_gaps_json JSONB;
