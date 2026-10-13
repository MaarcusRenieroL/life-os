-- ---------------------------------------------------------------------------
-- V6: strip the module back to a core job tracker.
--   Keeps: job_listings, companies, resumes, skills.
--   Drops: applications + pipeline, interviews, offers, referrals, contacts,
--          outreach, follow-up tasks, notifications, email ingestion,
--          cover letters, the resume builder (variants/sections/etc.).
--   Adds:  job_listings.status  (the candidate's own pipeline stage).
-- ---------------------------------------------------------------------------

alter table job_tracker_schema.job_listings
  add column status varchar(20) not null default 'INTERESTED'
  check (status in ('INTERESTED', 'APPLIED', 'INTERVIEWING', 'REJECTED', 'OFFER'));

alter table job_tracker_schema.resumes
  drop column if exists latex_source;

drop table if exists job_tracker_schema.cover_letter_versions      cascade;
drop table if exists job_tracker_schema.cover_letters              cascade;
drop table if exists job_tracker_schema.cover_letter_templates     cascade;
drop table if exists job_tracker_schema.resume_keyword_matches     cascade;
drop table if exists job_tracker_schema.resume_tailorings          cascade;
drop table if exists job_tracker_schema.resume_sections            cascade;
drop table if exists job_tracker_schema.resume_variants            cascade;
drop table if exists job_tracker_schema.accomplishments            cascade;
drop table if exists job_tracker_schema.resume_templates           cascade;

drop table if exists job_tracker_schema.notifications              cascade;
drop table if exists job_tracker_schema.follow_up_tasks            cascade;
drop table if exists job_tracker_schema.outreach_attempts          cascade;
drop table if exists job_tracker_schema.email_messages             cascade;
drop table if exists job_tracker_schema.offers                     cascade;
drop table if exists job_tracker_schema.referrals                  cascade;
drop table if exists job_tracker_schema.interview_preps            cascade;
drop table if exists job_tracker_schema.interview_rounds           cascade;
drop table if exists job_tracker_schema.application_status_history cascade;
drop table if exists job_tracker_schema.applications              cascade;
drop table if exists job_tracker_schema.contacts                   cascade;
drop table if exists job_tracker_schema.job_sources                cascade;
