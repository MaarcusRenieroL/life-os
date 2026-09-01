package com.lifeos.job_tracker.domains.dto.response;

import com.lifeos.job_tracker.domains.entity.EmailMessage;
import java.time.Instant;
import java.util.UUID;

public record EmailMessageResponse(
    UUID id,
    UUID applicationId,
    String direction,
    String threadId,
    String fromAddress,
    String toAddress,
    String subject,
    String body,
    String category,
    Instant receivedAt) {

  public static EmailMessageResponse from(EmailMessage message) {
    return new EmailMessageResponse(
        message.getId(),
        message.getApplicationId(),
        message.getDirection() == null ? null : message.getDirection().name(),
        message.getThreadId(),
        message.getFromAddress(),
        message.getToAddress(),
        message.getSubject(),
        message.getBody(),
        message.getCategory() == null ? null : message.getCategory().name(),
        message.getReceivedAt());
  }
}
