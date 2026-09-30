package com.lifeos.workouts.domains.dto.response;

import com.lifeos.workouts.domains.enums.Equipment;
import com.lifeos.workouts.domains.enums.ExerciseCategory;
import java.util.UUID;

public record ExerciseResponse(
    UUID id, String name, ExerciseCategory category, Equipment equipment, String instructions, boolean custom) {}
