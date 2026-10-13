-- Two more ways for a job to end without an application: the role stopped accepting applications, or the
-- candidate lost interest in it.
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
    'WITHDRAWN',
    'NO_LONGER_ACCEPTING',
    'NOT_INTERESTED'
  ));
