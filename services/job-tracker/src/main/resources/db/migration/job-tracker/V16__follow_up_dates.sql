-- Follow-up dates - the last gap from the original feature spec. Lets the candidate set "check
-- back on this by X" reminders on both a job application and a referral contact.

alter table job_tracker_schema.job_listings add column follow_up_at date;
alter table job_tracker_schema.referrals add column follow_up_at date;
