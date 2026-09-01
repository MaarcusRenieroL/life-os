package com.lifeos.job_tracker.domains.dto.response;

import com.lifeos.job_tracker.domains.entity.OutreachAttempt;
import java.time.Instant;
import java.util.UUID;

public record OutreachAttemptResponse(
    UUID id,
    UUID applicationId,
    String channel,
    String recipient,
    String subject,
    String messageBody,
    String status,
    Instant scheduledFor,
    Instant sentAt,
    boolean opened,
    boolean clicked,
    boolean replied,
    Instant responseDate,
    String error) {

  public static OutreachAttemptResponse from(OutreachAttempt attempt) {
    return new OutreachAttemptResponse(
        attempt.getId(),
        attempt.getApplicationId(),
        attempt.getChannel() == null ? null : attempt.getChannel().name(),
        attempt.getRecipient(),
        attempt.getSubject(),
        attempt.getMessageBody(),
        attempt.getStatus() == null ? null : attempt.getStatus().name(),
        attempt.getScheduledFor(),
        attempt.getSentAt(),
        attempt.isOpened(),
        attempt.isClicked(),
        attempt.isReplied(),
        attempt.getResponseDate(),
        attempt.getError());
  }
}
