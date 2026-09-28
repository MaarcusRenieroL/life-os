package com.lifeos.calendar.domains.enums;

/** Mirrors services/tasks' TaskRecurrencePattern - duplicated per-service rather than shared,
 * same convention as LifeArea. */
public enum EventRecurrencePattern {
  DAILY,
  WEEKLY,
  MONTHLY,
  CUSTOM
}
