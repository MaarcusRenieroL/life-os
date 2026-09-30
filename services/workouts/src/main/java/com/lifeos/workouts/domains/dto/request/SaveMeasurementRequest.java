package com.lifeos.workouts.domains.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

/** At least one measurement must be filled in (checked in the service) - all are optional so a
 * weigh-in doesn't need a tape measure. */
public record SaveMeasurementRequest(
    LocalDate measuredOn,
    @DecimalMin("1") @DecimalMax("999") BigDecimal weightKg,
    @DecimalMin("1") @DecimalMax("999") BigDecimal chestCm,
    @DecimalMin("1") @DecimalMax("999") BigDecimal waistCm,
    @DecimalMin("1") @DecimalMax("999") BigDecimal armsCm,
    @DecimalMin("1") @DecimalMax("999") BigDecimal legsCm,
    @DecimalMin("1") @DecimalMax("75") BigDecimal bodyFatPct,
    @Size(max = 2000) String notes) {}
