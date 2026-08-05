package com.lifeos.job_tracker.domains.record;

import java.util.List;

public record JobScoreResult(
    int scorePercentage,
    String reasoning,
    List<String> recommendedSections,
    List<String> interviewPrepTopics) {}
