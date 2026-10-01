package com.lifeos.workouts.domains.dto.request;

import com.lifeos.workouts.domains.enums.Equipment;
import com.lifeos.workouts.domains.enums.ExerciseCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SaveExerciseRequest(
    @NotBlank @Size(max = 120) String name,
    @NotNull ExerciseCategory category,
    @NotNull Equipment equipment,
    @Size(max = 5000) String instructions) {}
