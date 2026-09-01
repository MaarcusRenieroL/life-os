package com.lifeos.job_tracker.domains.dto.request;

import com.lifeos.job_tracker.domains.enums.RelationshipType;
import java.time.Instant;

public record UpdateContactRequest(
    String name,
    String role,
    String email,
    String phone,
    String linkedinUrl,
    RelationshipType relationshipType,
    Boolean vip,
    Instant lastInteractionDate,
    String notes) {}
