package com.lifeos.workouts.domains.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record MeasurementResponse(
    UUID id,
    LocalDate measuredOn,
    BigDecimal weightKg,
    BigDecimal chestCm,
    BigDecimal waistCm,
    BigDecimal armsCm,
    BigDecimal legsCm,
    BigDecimal bodyFatPct,
    String notes) {}
