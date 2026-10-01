package com.lifeos.tasks.domains.dto.response;

import com.lifeos.tasks.domains.enums.GoalStatus;
import java.time.LocalDate;
import java.util.UUID;

public record GoalReviewResponse(
    UUID id,
    LocalDate reviewDate,
    String progressSummary,
    String blockers,
    String nextSteps,
    String notes,
    int progressSnapshot,
    GoalStatus statusSnapshot) {}
