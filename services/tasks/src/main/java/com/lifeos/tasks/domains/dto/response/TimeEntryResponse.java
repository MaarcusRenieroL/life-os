package com.lifeos.tasks.domains.dto.response;

import com.lifeos.tasks.domains.enums.TimeEntryType;
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
public class TimeEntryResponse {

  UUID id;

  UUID taskId;

  TimeEntryType type;

  Instant startedAt;

  Instant endedAt;

  Integer durationMinutes;

  String notes;
}
