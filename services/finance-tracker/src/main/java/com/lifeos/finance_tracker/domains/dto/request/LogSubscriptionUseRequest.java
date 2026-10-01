package com.lifeos.finance_tracker.domains.dto.request;

import java.time.LocalDate;

/** date null means today. */
public record LogSubscriptionUseRequest(LocalDate date) {}
