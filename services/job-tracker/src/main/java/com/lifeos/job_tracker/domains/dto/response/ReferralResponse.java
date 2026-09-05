package com.lifeos.job_tracker.domains.dto.response;

import com.lifeos.job_tracker.domains.entity.Referral;
import java.time.Instant;
import java.util.UUID;

public record ReferralResponse(
    UUID id,
    UUID applicationId,
    UUID contactId,
    Instant outreachDate,
    String messageSent,
    boolean responseReceived,
    Instant responseDate,
    String referralStatus,
    Instant followUpDate,
    String notes) {

  public static ReferralResponse from(Referral referral) {
    return new ReferralResponse(
        referral.getId(),
        referral.getApplicationId(),
        referral.getContactId(),
        referral.getOutreachDate(),
        referral.getMessageSent(),
        referral.isResponseReceived(),
        referral.getResponseDate(),
        referral.getReferralStatus() == null ? null : referral.getReferralStatus().name(),
        referral.getFollowUpDate(),
        referral.getNotes());
  }
}
