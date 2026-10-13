-- ---------------------------------------------------------------------------
-- V4: paste-a-job-link flow replaces the scraper microservice.
--   * job listings can now be ingested from a pasted URL  -> ingested_by 'LINK'
--   * the scraper's job_sources config table is no longer used
-- ---------------------------------------------------------------------------

alter table job_tracker_schema.job_listings
  drop constraint if exists job_listings_ingested_by_check;

alter table job_tracker_schema.job_listings
  add constraint job_listings_ingested_by_check
  check (ingested_by in ('MANUAL', 'LINK', 'SCRAPER', 'EMAIL'));

drop table if exists job_tracker_schema.job_sources;
