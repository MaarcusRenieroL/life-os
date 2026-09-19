package com.lifeos.habit_tracker.domains.dto.response;

import java.time.LocalDate;
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
public class ConsistencyResponse {

  UUID habitId;

  String period;

  LocalDate periodStart;

  LocalDate periodEnd;

  int completions;

  int scheduledOccurrences;

  double score;
}
