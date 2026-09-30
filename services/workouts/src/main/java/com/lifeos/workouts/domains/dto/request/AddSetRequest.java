package com.lifeos.workouts.domains.dto.request;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/** Adds one more set of an exercise - the exercise may already be in the session (extra set) or
 * new to it (appended as the last exercise). */
public record AddSetRequest(@NotNull UUID exerciseId) {}
