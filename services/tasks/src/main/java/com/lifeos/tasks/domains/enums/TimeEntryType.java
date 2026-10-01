package com.lifeos.tasks.domains.enums;

/** Which phase of a Pomodoro-style session a time entry represents - kept simple (no separate
 * "long break" concept) since the frontend timer itself decides the work/break cadence; the
 * backend just records whichever phase actually ran. */
public enum TimeEntryType {
  WORK,
  BREAK
}
