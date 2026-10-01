package com.lifeos.tasks.domains.dto.response;

import java.util.UUID;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

/** Total WORK minutes logged against one task in a range - see TimeEntryService.summaryByTask. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TaskTimeSummary {

  UUID taskId;

  long totalMinutes;
}
