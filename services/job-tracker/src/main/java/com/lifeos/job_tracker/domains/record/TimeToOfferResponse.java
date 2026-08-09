package com.lifeos.job_tracker.domains.record;

import java.util.List;

public record TimeToOfferResponse(double averageDays, List<Integer> daysDistribution) {}
