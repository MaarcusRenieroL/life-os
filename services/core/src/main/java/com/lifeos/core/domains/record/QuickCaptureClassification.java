package com.lifeos.core.domains.record;

/** What the classifier decided a piece of free text was about. Only the field matching
 * {@code module} is populated - "note" is the safe catch-all when the text doesn't clearly match
 * finance, job, task or event (never loses the user's input by refusing to classify). */
public record QuickCaptureClassification(
    String module, // "finance" | "job" | "task" | "event" | "note"
    FinanceCapture finance,
    JobCapture job,
    NoteCapture note,
    TaskCapture task,
    EventCapture event) {

  public record FinanceCapture(String description, Double amount, String type) {}

  public record JobCapture(String company, String title) {}

  public record NoteCapture(String title, String body) {}

  /** Dates and times as the model writes them: {@code yyyy-MM-dd} and {@code HH:mm}, all optional. */
  public record TaskCapture(String title, String dueDate, String dueTime, String priority) {}

  public record EventCapture(String title, String date, String startTime, String endTime, String location) {}
}
