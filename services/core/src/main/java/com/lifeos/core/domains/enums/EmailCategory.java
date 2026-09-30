package com.lifeos.core.domains.enums;

/** What an email was judged to be. Only the first four lead to an action. */
public enum EmailCategory {
  /** Something the candidate must do, ideally by a date. */
  TASK,
  /** A bill or statement with a due date. Becomes a high-priority "pay" task. */
  BILL,
  /** An appointment, meeting, booking or trip with a date and time. */
  EVENT,
  /** A subscription receipt or renewal notice. */
  SUBSCRIPTION,
  /** Newsletters, marketing, notifications, chatter - nothing to do. */
  IGNORE
}
