package com.lifeos.tasks.domains.enums;

/** The fixed set of life categories from the product spec (Career, Health, Finance, Learning,
 * Relationships, Personal) - a closed enum, not a user-managed lookup table like Project/Goal,
 * since these six categories are meant to be shared and stable across every module that tags
 * something by "area" (this one, calendar, eventually habits). */
public enum LifeArea {
  CAREER,
  HEALTH,
  FINANCE,
  LEARNING,
  RELATIONSHIPS,
  PERSONAL
}
