package com.lifeos.tasks.domains.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

public record LogMetricEntryRequest(
    @NotNull BigDecimal value, @Size(max = 2000) String note, LocalDate recordedOn) {}
