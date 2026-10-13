-- ---------------------------------------------------------------------------
-- V5: store a resume's LaTeX source so tailoring can re-render it on the
--     candidate's own template instead of the generic PDFBox layout.
--   * on a base resume  -> the template (content + layout, as pasted/uploaded)
--   * on a tailored copy -> the job-tailored LaTeX that produced its PDF
-- ---------------------------------------------------------------------------

alter table job_tracker_schema.resumes
  add column latex_source text;
