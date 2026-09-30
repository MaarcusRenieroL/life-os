package com.lifeos.core.service;

import com.lifeos.core.domains.enums.EmailCategory;
import com.lifeos.core.domains.record.EmailAction;
import com.lifeos.core.domains.record.EmailClassification;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.Locale;
import java.util.Set;

/**
 * Decides what to do with a classification. Kept free of I/O so the rules can be tested exhaustively.
 *
 * <p>The model is trusted to <i>read</i> an email, not to be right about it: a small local model
 * will occasionally invent a date or call a newsletter a bill. So nothing is created without a
 * complete, plausible set of fields, and only a HIGH-confidence classification with every field
 * present is applied without asking. Anything less waits for a yes in the inbox, and mail the model
 * itself rates LOW is not acted on at all.
 */
final class EmailActionPlanner {

  /** A deadline older than this is news, not a to-do. */
  private static final int STALE_AFTER_DAYS = 30;

  private static final int FAR_FUTURE_DAYS = 800;
  private static final Set<String> CYCLES = Set.of("WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY");
  private static final Set<String> PRIORITIES = Set.of("URGENT", "HIGH", "MEDIUM", "LOW");

  enum Verdict {
    /** Nothing to do. */
    IGNORE,
    /** Worth doing, but wait for the candidate's yes. */
    REVIEW,
    /** Safe to do straight away. */
    AUTO
  }

  record Decision(Verdict verdict, EmailCategory category, EmailAction action, String reason) {
    static Decision ignore(EmailCategory category, String reason) {
      return new Decision(Verdict.IGNORE, category, null, reason);
    }
  }

  private EmailActionPlanner() {}

  static Decision decide(EmailClassification c, Instant now, ZoneId zone) {
    EmailCategory category = parseCategory(c == null ? null : c.category());
    if (c == null || category == EmailCategory.IGNORE) {
      return Decision.ignore(EmailCategory.IGNORE, "Nothing to act on");
    }
    String confidence = c.confidence() == null ? "LOW" : c.confidence().trim().toUpperCase(Locale.ROOT);
    if (confidence.equals("LOW")) {
      return Decision.ignore(category, "Too uncertain to act on");
    }
    boolean high = confidence.equals("HIGH");
    LocalDate today = now.atZone(zone).toLocalDate();

    return switch (category) {
      case TASK -> task(c, high, today, category);
      case BILL -> bill(c, high, today, category);
      case EVENT -> event(c, high, now, zone, category);
      case SUBSCRIPTION -> subscription(c, high, category);
      case IGNORE -> Decision.ignore(category, "Nothing to act on");
    };
  }

  private static Decision task(EmailClassification c, boolean high, LocalDate today, EmailCategory category) {
    EmailClassification.Task t = c.task();
    if (t == null || blank(t.title())) {
      return Decision.ignore(category, "No clear task in this email");
    }
    LocalDate due = date(t.dueDate());
    if (due != null && due.isBefore(today.minusDays(STALE_AFTER_DAYS))) {
      return Decision.ignore(category, "The deadline has long passed");
    }
    boolean plausible = due != null && !due.isAfter(today.plusDays(FAR_FUTURE_DAYS));
    EmailAction action =
        new EmailAction(
            "TASK", clip(t.title(), 200), clip(t.notes(), 1000), priority(t.priority(), "MEDIUM"),
            plausible ? due : null, plausible ? time(t.dueTime()) : null, plausible && time(t.dueTime()) == null,
            null, null, null, null, null, null, null, null);
    // A task with no deadline is usually an FYI, so it always asks first.
    return new Decision(high && plausible ? Verdict.AUTO : Verdict.REVIEW, category, action, plausible ? null : "No deadline found");
  }

  private static Decision bill(EmailClassification c, boolean high, LocalDate today, EmailCategory category) {
    EmailClassification.Bill b = c.bill();
    if (b == null || blank(b.payee())) {
      return Decision.ignore(category, "No clear bill in this email");
    }
    LocalDate due = date(b.dueDate());
    if (due != null && due.isBefore(today.minusDays(STALE_AFTER_DAYS))) {
      return Decision.ignore(category, "This bill's due date has long passed");
    }
    boolean plausible = due != null && !due.isAfter(today.plusDays(FAR_FUTURE_DAYS));
    String amount = b.amount() != null && b.amount() > 0 ? " - " + money(b.amount(), b.currency()) : "";
    EmailAction action =
        new EmailAction(
            "TASK", clip("Pay " + b.payee().trim() + amount, 200), "Bill found in your email.", "HIGH",
            plausible ? due : null, null, true, null, null, null, null, null, null, null, null);
    return new Decision(high && plausible ? Verdict.AUTO : Verdict.REVIEW, category, action, plausible ? null : "No due date found");
  }

  private static Decision event(EmailClassification c, boolean high, Instant now, ZoneId zone, EmailCategory category) {
    EmailClassification.Event e = c.event();
    if (e == null || blank(e.title())) {
      return Decision.ignore(category, "No clear event in this email");
    }
    boolean allDay = Boolean.TRUE.equals(e.allDay());
    String location = clip(e.location(), 300);
    String notes = clip(e.notes(), 1000);

    if (allDay || (blank(e.start()) && !blank(e.startDate()))) {
      LocalDate start = date(!blank(e.startDate()) ? e.startDate() : e.start());
      if (start == null) {
        return new Decision(Verdict.REVIEW, category, null, "Couldn't read the event's date");
      }
      LocalDate end = date(e.endDate());
      if (start.isBefore(now.atZone(zone).toLocalDate().minusDays(1))) {
        return Decision.ignore(category, "That event has already happened");
      }
      EmailAction action =
          new EmailAction(
              "EVENT", clip(e.title(), 200), notes, null, null, null, true, null, null, start,
              end == null || end.isBefore(start) ? start : end, location, null, null, null);
      return new Decision(high && !start.isAfter(now.atZone(zone).toLocalDate().plusDays(FAR_FUTURE_DAYS)) ? Verdict.AUTO : Verdict.REVIEW, category, action, null);
    }

    Instant start = instant(e.start(), zone);
    if (start == null) {
      return new Decision(Verdict.REVIEW, category, null, "Couldn't read the event's time");
    }
    if (start.isBefore(now.minus(Duration.ofDays(1)))) {
      return Decision.ignore(category, "That event has already happened");
    }
    Instant end = instant(e.end(), zone);
    if (end == null || !end.isAfter(start)) {
      end = start.plus(Duration.ofHours(1));
    }
    EmailAction action =
        new EmailAction("EVENT", clip(e.title(), 200), notes, null, null, null, false, start, end, null, null, location, null, null, null);
    boolean sane = start.isBefore(now.plus(Duration.ofDays(FAR_FUTURE_DAYS)));
    return new Decision(high && sane ? Verdict.AUTO : Verdict.REVIEW, category, action, null);
  }

  private static Decision subscription(EmailClassification c, boolean high, EmailCategory category) {
    EmailClassification.Subscription s = c.subscription();
    if (s == null || blank(s.name())) {
      return Decision.ignore(category, "No clear subscription in this email");
    }
    if (s.amount() == null || s.amount() <= 0) {
      return new Decision(Verdict.REVIEW, category, null, "Couldn't find the amount");
    }
    String cycle = s.billingCycle() == null ? "" : s.billingCycle().trim().toUpperCase(Locale.ROOT);
    if (!CYCLES.contains(cycle)) {
      return new Decision(Verdict.REVIEW, category, null, "Couldn't tell how often it bills");
    }
    LocalDate next = date(s.nextBillingDate());
    EmailAction action =
        new EmailAction(
            "SUBSCRIPTION", clip(s.name(), 200), null, null, null, null, false, null, null, null, null, null,
            BigDecimal.valueOf(s.amount()).setScale(2, java.math.RoundingMode.HALF_UP), cycle, next);
    // Finance needs a billing date; without one the candidate supplies it, so ask.
    return new Decision(high && next != null ? Verdict.AUTO : Verdict.REVIEW, category, action, next == null ? "No billing date found" : null);
  }

  // -- parsing ------------------------------------------------------------

  static EmailCategory parseCategory(String raw) {
    if (raw == null) return EmailCategory.IGNORE;
    try {
      return EmailCategory.valueOf(raw.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException unknown) {
      return EmailCategory.IGNORE;
    }
  }

  static LocalDate date(String raw) {
    if (blank(raw)) return null;
    String text = raw.trim();
    try {
      return LocalDate.parse(text.length() > 10 ? text.substring(0, 10) : text);
    } catch (DateTimeParseException unreadable) {
      return null;
    }
  }

  private static LocalTime time(String raw) {
    if (blank(raw)) return null;
    try {
      return LocalTime.parse(raw.trim());
    } catch (DateTimeParseException unreadable) {
      return null;
    }
  }

  /** Reads a date-time in the user's own zone, or honours an explicit offset if the model gave one. */
  static Instant instant(String raw, ZoneId zone) {
    if (blank(raw)) return null;
    String text = raw.trim();
    try {
      return OffsetDateTime.parse(text).toInstant();
    } catch (DateTimeParseException notOffset) {
      try {
        return LocalDateTime.parse(text.replace(' ', 'T')).atZone(zone).toInstant();
      } catch (DateTimeParseException unreadable) {
        return null;
      }
    }
  }

  private static String priority(String raw, String fallback) {
    String p = raw == null ? "" : raw.trim().toUpperCase(Locale.ROOT);
    return PRIORITIES.contains(p) ? p : fallback;
  }

  private static String money(Double amount, String currency) {
    String value = amount % 1 == 0 ? String.valueOf(amount.longValue()) : String.format(Locale.ROOT, "%.2f", amount);
    return blank(currency) ? value : currency.trim().toUpperCase(Locale.ROOT) + " " + value;
  }

  private static String clip(String value, int max) {
    if (value == null) return null;
    String trimmed = value.trim();
    return trimmed.length() <= max ? trimmed : trimmed.substring(0, max);
  }

  private static boolean blank(String value) {
    return value == null || value.isBlank();
  }
}
