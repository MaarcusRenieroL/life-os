package com.lifeos.job_tracker.domains.dto.response;

import com.lifeos.job_tracker.domains.entity.Contact;
import java.time.Instant;
import java.util.UUID;

public record ContactResponse(
    UUID id,
    UUID companyId,
    String name,
    String role,
    String email,
    String phone,
    String linkedinUrl,
    String relationshipType,
    boolean vip,
    Instant lastInteractionDate,
    String notes,
    Instant createdAt) {

  public static ContactResponse from(Contact contact) {
    return new ContactResponse(
        contact.getId(),
        contact.getCompanyId(),
        contact.getName(),
        contact.getRole(),
        contact.getEmail(),
        contact.getPhone(),
        contact.getLinkedinUrl(),
        contact.getRelationshipType() == null ? null : contact.getRelationshipType().name(),
        contact.isVip(),
        contact.getLastInteractionDate(),
        contact.getNotes(),
        contact.getCreatedAt());
  }
}
