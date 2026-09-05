package com.lifeos.job_tracker.domains.dto.request;

import com.lifeos.job_tracker.domains.enums.ReferralStatus;
import java.time.Instant;

public record UpdateReferralRequest(
    ReferralStatus referralStatus,
    Boolean responseReceived,
    Instant responseDate,
    Instant followUpDate,
    String notes) {}
