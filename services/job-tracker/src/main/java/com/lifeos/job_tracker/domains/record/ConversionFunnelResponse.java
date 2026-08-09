package com.lifeos.job_tracker.domains.record;

// Approximation: applications only store a single currentStage snapshot, not a
// history of every stage they've passed through. So "reached recruiter
// screening" here means "currently at or past recruiter screening" among
// applications that are still ACTIVE or OFFER_RECEIVED/ACCEPTED - rejected and
// withdrawn applications are excluded since we can't tell how far they
// actually got before that happened, without a stage-history table.
public record ConversionFunnelResponse(long applied, long recruiterScreening, long interviewing, long offer) {}
