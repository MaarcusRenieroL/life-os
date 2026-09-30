package com.lifeos.workouts.domains.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

public record RoutineExerciseInput(
    @NotNull UUID exerciseId,
    @Min(1) @Max(20) Integer targetSets,
    @Min(1) @Max(500) Integer targetReps,
    @DecimalMin("0") BigDecimal targetWeight,
    @Min(0) @Max(3600) Integer restSeconds) {}
