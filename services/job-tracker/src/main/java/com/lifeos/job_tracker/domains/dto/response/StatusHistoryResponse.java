package com.lifeos.job_tracker.domains.dto.response;

import com.lifeos.job_tracker.domains.entity.ApplicationStatusHistory;
import java.time.Instant;
import java.util.UUID;

public record StatusHistoryResponse(
    UUID id, String oldStatus, String newStatus, String note, String changedBy, Instant changedAt) {

  public static StatusHistoryResponse from(ApplicationStatusHistory history) {
    return new StatusHistoryResponse(
        history.getId(),
        history.getOldStatus(),
        history.getNewStatus(),
        history.getNote(),
        history.getChangedBy() == null ? null : history.getChangedBy().name(),
        history.getChangedAt());
  }
}
