package com.lifeos.core.domains.record;

/** What the classifier decided a piece of free text was about. Only the field matching
 * {@code module} is populated - "note" is the safe catch-all when the text doesn't clearly match
 * finance or job (never loses the user's input by refusing to classify). */
public record QuickCaptureClassification(
    String module, // "finance" | "job" | "note"
    FinanceCapture finance,
    JobCapture job,
    NoteCapture note) {

  public record FinanceCapture(String description, Double amount, String type) {}

  public record JobCapture(String company, String title) {}

  public record NoteCapture(String title, String body) {}
}
