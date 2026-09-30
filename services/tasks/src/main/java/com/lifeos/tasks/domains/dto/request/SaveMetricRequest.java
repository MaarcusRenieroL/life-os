package com.lifeos.tasks.domains.dto.request;

import com.lifeos.tasks.domains.enums.GoalMetricType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record SaveMetricRequest(
    @NotBlank @Size(max = 120) String name,
    @NotNull GoalMetricType metricType,
    @Size(max = 20) String unit,
    BigDecimal startValue,
    @NotNull BigDecimal targetValue) {}
