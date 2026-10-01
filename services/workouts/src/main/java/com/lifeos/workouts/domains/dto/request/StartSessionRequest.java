package com.lifeos.workouts.domains.dto.request;

import jakarta.validation.constraints.Size;
import java.util.UUID;

/** routineId null starts a blank session (exercises are added as you go); name defaults to the
 * routine's name, or "Workout". */
public record StartSessionRequest(UUID routineId, @Size(max = 120) String name, UUID goalId) {}
