package com.lifeos.workouts.domains.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.math.BigDecimal;

/** Sent whole by the set row - null actual values mean "not logged". completed is what marks the
 * set done (and is the only thing that can set off a personal record). */
public record UpdateSetRequest(
    @Min(0) @Max(1000) Integer actualReps,
    @DecimalMin("0") @DecimalMax("10000") BigDecimal actualWeight,
    @Min(0) @Max(3600) Integer restSeconds,
    Boolean completed) {}
