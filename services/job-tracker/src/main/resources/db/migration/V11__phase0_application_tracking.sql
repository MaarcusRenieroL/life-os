-- Phase 0 of the Job Management / Application Tracking gap-fill: a free-text notes field, the
-- actual date an application was submitted (distinct from created_at, which is just "added to
-- the tracker"), a rejection reason (auto-filled from the detected email, editable), basic offer
-- details, a generated cover letter, and the WITHDRAWN pipeline stage.

alter table job_tracker_schema.job_listings drop constraint job_listings_status_check;

alter table job_tracker_schema.job_listings add constraint job_listings_status_check
  check (status in (
    'INTERESTED',
    'WAITING_FOR_REFERRAL',
    'REFERRED',
    'APPLIED',
    'INTERVIEWING',
    'WAITING_FOR_HR',
    'OFFER_ACCEPTED',
    'OFFER_REJECTED',
    'REJECTED',
    'WITHDRAWN'
  ));

alter table job_tracker_schema.job_listings
  add column notes text,
  add column applied_at date,
  add column rejection_reason text,
  add column offer_amount numeric(12, 2),
  add column offer_deadline date,
  add column offer_notes text,
  add column cover_letter_text text;
