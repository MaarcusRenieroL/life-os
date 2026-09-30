package com.lifeos.tasks.domains.dto.response;

import java.util.List;

public record GoalDetailResponse(
    GoalSummaryResponse goal,
    List<GoalMilestoneResponse> milestones,
    List<GoalMetricResponse> metrics,
    List<GoalLinkResponse> links,
    List<GoalReviewResponse> reviews,
    List<GoalLinkedTaskResponse> tasks) {}
