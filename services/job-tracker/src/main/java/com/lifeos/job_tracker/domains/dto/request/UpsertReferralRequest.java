package com.lifeos.job_tracker.domains.dto.request;

import java.time.LocalDate;

public record UpsertReferralRequest(
    String contactName,
    String contactTitle,
    String contactLinkedinUrl,
    String contactEmail,
    String relationship,
    String status,
    String notes,
    LocalDate contactedAt) {}
