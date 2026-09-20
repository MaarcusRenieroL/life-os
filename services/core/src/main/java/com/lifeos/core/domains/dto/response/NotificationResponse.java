package com.lifeos.core.domains.dto.response;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationResponse {

  UUID id;

  String module;

  String type;

  String title;

  String body;

  Map<String, String> metadata;

  boolean read;

  boolean requiresAiFallbackApproval;

  Boolean aiFallbackApproved;

  Instant occurredAt;
}
