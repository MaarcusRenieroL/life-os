-- People the candidate already knows at a company (ex-colleagues, seniors, friends) - the pool a
-- referral ask should start from. Held on the company, not the job, so someone noted while looking
-- at one Stripe role is there for every other Stripe role too.
alter table job_tracker_schema.companies add column if not exists known_people_json jsonb;
