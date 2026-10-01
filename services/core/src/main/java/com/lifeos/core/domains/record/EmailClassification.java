package com.lifeos.core.domains.record;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * What the model made of one email. Every field is a string or number the model was asked to
 * produce as-is - dates as {@code YYYY-MM-DD}, date-times as {@code YYYY-MM-DDTHH:mm} in the
 * user's own time zone - and {@link com.lifeos.core.service.EmailActionPlanner} is what decides
 * whether any of it is trustworthy enough to act on. Only the block matching {@code category} is
 * expected to be filled in.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record EmailClassification(
    String category,
    String confidence,
    String summary,
    Task task,
    Bill bill,
    Event event,
    Subscription subscription) {

  @JsonIgnoreProperties(ignoreUnknown = true)
  public record Task(String title, String dueDate, String dueTime, String priority, String notes) {}

  @JsonIgnoreProperties(ignoreUnknown = true)
  public record Bill(String payee, Double amount, String currency, String dueDate) {}

  @JsonIgnoreProperties(ignoreUnknown = true)
  public record Event(
      String title, String start, String end, String startDate, String endDate, Boolean allDay, String location, String notes) {}

  @JsonIgnoreProperties(ignoreUnknown = true)
  public record Subscription(String name, Double amount, String currency, String billingCycle, String nextBillingDate) {}
}
