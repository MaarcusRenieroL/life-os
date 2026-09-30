package com.lifeos.workouts.domains.dto.response;

import java.util.List;
import java.util.UUID;

/** templateGroup is set only on pre-built templates (e.g. "Push/Pull/Legs"). */
public record RoutineResponse(
    UUID id, String name, String description, String templateGroup, boolean template, List<RoutineExerciseResponse> exercises) {}
