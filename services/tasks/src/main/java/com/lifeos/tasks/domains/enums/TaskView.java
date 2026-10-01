package com.lifeos.tasks.domains.enums;

/** Named list-shaping presets the frontend's Today/Upcoming/Overdue/Inbox/Completed pages map
 * onto, computed server-side against "now" rather than reimplemented per-client. PLAIN applies no
 * view-specific shaping - just the explicit filters passed alongside it. */
public enum TaskView {
  PLAIN,
  TODAY,
  UPCOMING,
  OVERDUE,
  INBOX,
  COMPLETED
}
