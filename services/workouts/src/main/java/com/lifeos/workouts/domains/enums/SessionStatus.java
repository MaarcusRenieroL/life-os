package com.lifeos.workouts.domains.enums;

/** PLANNED (scheduled, shows on the calendar, nothing logged) -> IN_PROGRESS (sets being logged)
 * -> COMPLETED. A session started on the spot skips PLANNED. */
public enum SessionStatus {
  PLANNED,
  IN_PROGRESS,
  COMPLETED
}
