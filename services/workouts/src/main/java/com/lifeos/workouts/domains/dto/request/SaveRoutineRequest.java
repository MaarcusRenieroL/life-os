package com.lifeos.workouts.domains.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

/** Create and update share this - update replaces the whole exercise list, in the order sent. */
public record SaveRoutineRequest(
    @NotBlank @Size(max = 120) String name,
    @Size(max = 2000) String description,
    @Valid List<RoutineExerciseInput> exercises) {}
