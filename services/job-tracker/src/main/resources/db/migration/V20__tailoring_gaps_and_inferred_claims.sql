-- Splits the tailored-resume output into three distinct lists instead of one mixed
-- "improvements" bucket: what was reworded/reordered, what the job wants that the candidate's
-- real background doesn't support, and any rephrasing beyond a straightforward reording that the
-- candidate should confirm before sending the resume out.
ALTER TABLE job_tracker_schema.job_listings
  ADD COLUMN tailored_gaps_vs_jd_json JSONB,
  ADD COLUMN tailored_inferred_claims_json JSONB;

ALTER TABLE job_tracker_schema.job_tailoring_versions
  ADD COLUMN gaps_vs_jd_json JSONB,
  ADD COLUMN inferred_claims_json JSONB;
