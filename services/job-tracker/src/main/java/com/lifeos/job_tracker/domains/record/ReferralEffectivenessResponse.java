package com.lifeos.job_tracker.domains.record;

public record ReferralEffectivenessResponse(
    double referredOfferRate, long referredCount, double nonReferredOfferRate, long nonReferredCount) {}
