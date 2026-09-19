package com.lifeos.habit_tracker.domains.enums;

/**
 * Kinds of in-app habit notification. These are derived live from habits, logs and streaks on
 * every request - nothing is stored, so there is no table, no read/unread state and no delivery
 * channel behind them (explicitly in-app only: no email, no push).
 */
public enum NotificationType {

  /** An active streak that is scheduled today and hasn't been logged yet. */
  STREAK_AT_RISK,

  /** A current streak sitting exactly on a milestone threshold. */
  STREAK_MILESTONE,

  /** Recap of the week just gone. */
  WEEKLY_SUMMARY,

  /** A reminder time suggested from when the user actually logs completions. */
  REMINDER_SUGGESTION
}
