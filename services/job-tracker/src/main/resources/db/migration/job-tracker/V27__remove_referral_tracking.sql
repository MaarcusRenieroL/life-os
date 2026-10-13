-- Referral tracking is replaced by a per-job "referral message" card that builds the candidate's
-- standard ask on demand (JobListingService.referralMessage), so nothing needs storing.
--
-- Dropping the table discards the per-contact rows (name, title, notes, status, follow-up date). The
-- pipeline statuses WAITING_FOR_REFERRAL / REFERRED on job_listings are untouched.

drop table if exists job_tracker_schema.referrals;
