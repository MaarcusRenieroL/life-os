package com.lifeos.tasks.domains.dto.response;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record GoalMilestoneResponse(
    UUID id, String title, LocalDate targetDate, boolean completed, Instant completedAt) {}
