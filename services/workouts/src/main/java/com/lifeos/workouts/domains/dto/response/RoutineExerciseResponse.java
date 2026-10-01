package com.lifeos.workouts.domains.dto.response;

import com.lifeos.workouts.domains.enums.ExerciseCategory;
import java.math.BigDecimal;
import java.util.UUID;

public record RoutineExerciseResponse(
    UUID exerciseId,
    String exerciseName,
    ExerciseCategory category,
    int position,
    int targetSets,
    int targetReps,
    BigDecimal targetWeight,
    int restSeconds) {}
