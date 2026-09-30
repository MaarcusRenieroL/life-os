package com.lifeos.workouts.domains.dto.request;

import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

/** Every field replaces what's stored (null clears goalId/notes); scheduledFor only applies to a
 * PLANNED session. */
public record UpdateSessionRequest(
    @Size(max = 120) String name, UUID goalId, @Size(max = 5000) String notes, Instant scheduledFor) {}
