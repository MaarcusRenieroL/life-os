-- Expands the candidate's pipeline stage from 5 values to the real referral/interview/HR flow.
-- OFFER splits into OFFER_ACCEPTED / OFFER_REJECTED; REJECTED stays reachable from any pre-offer stage.

update job_tracker_schema.job_listings set status = 'OFFER_ACCEPTED' where status = 'OFFER';

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
    'REJECTED'
  ));
