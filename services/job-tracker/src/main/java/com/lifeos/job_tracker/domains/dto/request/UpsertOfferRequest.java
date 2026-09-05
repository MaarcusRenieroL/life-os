package com.lifeos.job_tracker.domains.dto.request;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record UpsertOfferRequest(
    BigDecimal salary,
    String currency,
    List<String> benefits,
    LocalDate startDate,
    String notes,
    Boolean accepted) {}
