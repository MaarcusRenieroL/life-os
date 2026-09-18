-- The tailored-resume result only ever lived in frontend component state, so it vanished on
-- refresh. Persist the latest tailoring per job so the detail page can show it again on load.

alter table job_tracker_schema.job_listings
  add column tailored_improvement_points_json jsonb,
  add column tailored_latex_resume text;
