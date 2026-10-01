package com.lifeos.tasks.domains.dto.response;

import com.lifeos.tasks.domains.enums.GoalMetricType;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/** currentValue is the most recent entry (falling back to startValue before anything is logged);
 * entries come newest-first. */
public record GoalMetricResponse(
    UUID id,
    String name,
    GoalMetricType metricType,
    String unit,
    BigDecimal startValue,
    BigDecimal targetValue,
    BigDecimal currentValue,
    int progressPct,
    List<GoalMetricEntryResponse> entries) {}
