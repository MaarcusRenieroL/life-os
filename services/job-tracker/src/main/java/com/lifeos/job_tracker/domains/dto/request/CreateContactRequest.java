package com.lifeos.job_tracker.domains.dto.request;

import com.lifeos.job_tracker.domains.enums.RelationshipType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public record CreateContactRequest(
    @NotBlank String name,
    UUID companyId,
    String companyName,
    String role,
    @Email String email,
    String phone,
    String linkedinUrl,
    RelationshipType relationshipType,
    Boolean vip,
    String notes) {}
