package com.lifeos.tasks.domains.dto.response;

import com.lifeos.tasks.domains.enums.GoalReviewFrequency;
import com.lifeos.tasks.domains.enums.GoalStatus;
import com.lifeos.tasks.domains.enums.LifeArea;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record GoalSummaryResponse(
    UUID id,
    String name,
    String description,
    LifeArea area,
    int priority,
    GoalStatus status,
    LocalDate startDate,
    LocalDate targetDate,
    GoalReviewFrequency reviewFrequency,
    LocalDate nextReviewDate,
    boolean reviewDue,
    boolean blocked,
    Instant completedAt,
    Instant createdAt,
    GoalProgressBreakdownResponse progress) {}
