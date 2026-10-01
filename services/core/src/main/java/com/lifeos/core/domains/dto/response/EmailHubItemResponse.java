package com.lifeos.core.domains.dto.response;

import com.lifeos.core.domains.entity.EmailHubItem;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record EmailHubItemResponse(
    UUID id,
    String fromAddress,
    String subject,
    String snippet,
    Instant receivedAt,
    String category,
    String confidence,
    String summary,
    Map<String, Object> proposal,
    String status,
    String targetModule,
    String targetId,
    String note,
    Instant createdAt) {

  public static EmailHubItemResponse from(EmailHubItem item) {
    return new EmailHubItemResponse(
        item.getId(),
        item.getFromAddress(),
        item.getSubject(),
        item.getSnippet(),
        item.getReceivedAt(),
        item.getCategory().name(),
        item.getConfidence(),
        item.getSummary(),
        item.getProposal(),
        item.getStatus().name(),
        item.getTargetModule(),
        item.getTargetId(),
        item.getNote(),
        item.getCreatedAt());
  }
}
