package com.lifeos.workouts.domains.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

public record ScheduleSessionRequest(
    UUID routineId, @Size(max = 120) String name, @NotNull Instant scheduledFor, UUID goalId) {}
