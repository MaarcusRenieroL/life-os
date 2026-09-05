package com.lifeos.job_tracker.domains.dto.response;

import java.util.List;

public record ApplicationDetailResponse(
    ApplicationResponse application,
    JobListingResponse job,
    List<StatusHistoryResponse> statusHistory,
    List<InterviewRoundResponse> interviews,
    List<ReferralResponse> referrals,
    OfferResponse offer) {}
