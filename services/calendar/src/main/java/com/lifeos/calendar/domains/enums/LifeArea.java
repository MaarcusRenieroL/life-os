package com.lifeos.calendar.domains.enums;

/** Mirrors services/tasks' LifeArea - the same fixed six-category set from the product spec,
 * duplicated per-service rather than shared since this codebase doesn't share domain enums across
 * service boundaries (see GlobalExceptionHandler's per-service copy for the same convention). */
public enum LifeArea {
  CAREER,
  HEALTH,
  FINANCE,
  LEARNING,
  RELATIONSHIPS,
  PERSONAL
}
