package com.lifeos.calendar.domains.dto.response;

import com.lifeos.calendar.domains.enums.EventCategory;
import com.lifeos.calendar.domains.enums.LifeArea;
import java.util.Map;
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
public class UtilizationResponse {

  long totalMinutes;

  Map<EventCategory, Long> minutesByCategory;

  // Only areas actually used by a BUSY timed event in range appear here - an event with no area
  // set contributes to totalMinutes/minutesByCategory but not to this map.
  Map<LifeArea, Long> minutesByArea;
}
