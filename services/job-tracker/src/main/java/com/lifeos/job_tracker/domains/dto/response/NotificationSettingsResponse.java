package com.lifeos.job_tracker.domains.dto.response;

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
public class NotificationSettingsResponse {

  UUID id;

  boolean emailOnStageChange;

  boolean emailOnInterviewScheduled;

  boolean emailOnOfferReceived;

  boolean emailOnFollowUpDue;

  Instant updatedAt;
}
