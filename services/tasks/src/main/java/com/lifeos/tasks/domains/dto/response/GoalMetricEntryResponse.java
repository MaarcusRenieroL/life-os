package com.lifeos.tasks.domains.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record GoalMetricEntryResponse(UUID id, BigDecimal value, String note, LocalDate recordedOn) {}
