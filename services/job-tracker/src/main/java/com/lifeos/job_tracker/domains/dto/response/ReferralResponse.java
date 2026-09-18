package com.lifeos.job_tracker.domains.dto.response;

import com.lifeos.job_tracker.domains.entity.Referral;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record ReferralResponse(
    UUID id,
    UUID jobId,
    String contactName,
    String contactTitle,
    String contactLinkedinUrl,
    String contactEmail,
    String relationship,
    String status,
    String draftMessage,
    String notes,
    LocalDate contactedAt,
    LocalDate followUpAt,
    Instant createdAt) {

  public static ReferralResponse from(Referral referral) {
    return new ReferralResponse(
        referral.getId(),
        referral.getJobId(),
        referral.getContactName(),
        referral.getContactTitle(),
        referral.getContactLinkedinUrl(),
        referral.getContactEmail(),
        referral.getRelationship(),
        referral.getStatus() == null ? null : referral.getStatus().name(),
        referral.getDraftMessage(),
        referral.getNotes(),
        referral.getContactedAt(),
        referral.getFollowUpAt(),
        referral.getCreatedAt());
  }
}
