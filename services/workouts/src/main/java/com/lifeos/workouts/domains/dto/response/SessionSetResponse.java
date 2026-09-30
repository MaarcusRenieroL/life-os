package com.lifeos.workouts.domains.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record SessionSetResponse(
    UUID id,
    int setNumber,
    Integer targetReps,
    BigDecimal targetWeight,
    Integer actualReps,
    BigDecimal actualWeight,
    Integer restSeconds,
    boolean completed,
    Instant completedAt,
    boolean pr) {}
