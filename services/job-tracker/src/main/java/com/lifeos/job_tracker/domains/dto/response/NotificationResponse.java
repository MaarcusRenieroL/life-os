package com.lifeos.job_tracker.domains.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.lifeos.job_tracker.domains.enums.NotificationReferenceType;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class NotificationResponse {

  UUID id;

  NotificationReferenceType referenceType;

  UUID referenceId;

  String message;

  @JsonProperty("isRead")
  boolean isRead;

  Instant createdAt;
}
