package com.lifeos.core.domains.record;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

/**
 * A validated, ready-to-execute change to another module - the planner's output and the shape saved
 * on a review-queue item so approving it later does exactly what was proposed.
 *
 * @param kind {@code TASK}, {@code EVENT} or {@code SUBSCRIPTION}. A bill is a TASK with a "Pay"
 *     title, so it needs no kind of its own downstream.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record EmailAction(
    String kind,
    String title,
    String description,
    String priority,
    LocalDate dueDate,
    LocalTime dueTime,
    boolean allDay,
    Instant startAt,
    Instant endAt,
    LocalDate startDate,
    LocalDate endDate,
    String location,
    BigDecimal amount,
    String billingCycle,
    LocalDate nextBillingDate) {}
