-- Indexes for the two reminder-sweep queries, which currently seq-scan.
--
-- InterviewRepository.findByResultAndScheduledAtBetween(result, from, to) filters on result and
-- ranges over scheduled_at; the existing interviews indexes are on job_id and user_id only, so
-- neither helps. Same for ReferralRepository.findByStatusNotInAndFollowUpAtLessThanEqual(statuses,
-- cutoff), which filters status and ranges over follow_up_at.
--
-- Leading equality column first, range column second, matching the query shape. The user-scoped
-- variants of both methods (findByUserIdAndResultAndScheduledAtBetween, and the referral
-- equivalent) are already served well enough by the existing user_id indexes.
--
-- job_listings (user_id, url) for JobListingRepository.findByUserIdAndUrl is deliberately NOT
-- added here: V1's partial unique index uq_job_listings_user_url on (user_id, url) already covers
-- that lookup.

create index interviews_result_scheduled_at_idx
  on job_tracker_schema.interviews(result, scheduled_at);

create index referrals_status_follow_up_at_idx
  on job_tracker_schema.referrals(status, follow_up_at);
