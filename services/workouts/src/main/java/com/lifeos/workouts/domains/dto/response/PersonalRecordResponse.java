package com.lifeos.workouts.domains.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PersonalRecordResponse(
    UUID id, UUID exerciseId, String exerciseName, BigDecimal weight, int reps, Instant achievedAt, UUID sessionId) {}
