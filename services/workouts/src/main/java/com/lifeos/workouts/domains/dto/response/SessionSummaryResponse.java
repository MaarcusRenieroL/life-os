package com.lifeos.workouts.domains.dto.response;

import com.lifeos.workouts.domains.enums.SessionStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record SessionSummaryResponse(
    UUID id,
    String name,
    SessionStatus status,
    UUID routineId,
    UUID goalId,
    UUID calendarEventId,
    Instant scheduledFor,
    Instant startedAt,
    Instant completedAt,
    Integer durationSeconds,
    String notes,
    int totalSets,
    int completedSets,
    BigDecimal volume,
    int prCount) {}
