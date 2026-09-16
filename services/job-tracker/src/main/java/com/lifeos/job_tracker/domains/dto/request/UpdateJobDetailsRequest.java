package com.lifeos.job_tracker.domains.dto.request;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Editable application-tracking fields, saved together as one form - status changes go through
 * {@link UpdateJobListingRequest} instead, since that's a single-click dropdown, not a form. */
public record UpdateJobDetailsRequest(
    String notes,
    LocalDate appliedAt,
    String rejectionReason,
    BigDecimal offerAmount,
    LocalDate offerDeadline,
    String offerNotes) {}
