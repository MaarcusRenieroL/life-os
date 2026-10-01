package com.lifeos.habit_tracker.domains.dto.response;

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
public class HourlyLogCountResponse {

  /** Hour of day 0-23 in the requested time zone. */
  int hour;

  int completions;
}
