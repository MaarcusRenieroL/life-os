package com.lifeos.workouts.domains.dto.response;

import com.lifeos.workouts.domains.enums.ExerciseCategory;
import java.util.List;
import java.util.UUID;

/** One exercise's current best plus every time it was beaten, newest first. */
public record ExerciseRecordsResponse(
    UUID exerciseId,
    String exerciseName,
    ExerciseCategory category,
    PersonalRecordResponse best,
    List<PersonalRecordResponse> history) {}
