package com.lifeos.workouts.domains.dto.response;

import com.lifeos.workouts.domains.enums.ExerciseCategory;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/** previousBest is the exercise's heaviest completed weight before this session, so the logging
 * screen can show what there is to beat. */
public record SessionExerciseResponse(
    UUID exerciseId,
    String exerciseName,
    ExerciseCategory category,
    int position,
    BigDecimal previousBest,
    List<SessionSetResponse> sets) {}
