package com.lifeos.job_tracker.domains.enums;

import java.util.Arrays;

/**
 * Pipeline stages. The wire/DB representation is the human-readable {@link #value} (e.g.
 * "Recruiter Contacted") to match the spec's status vocabulary and the V1 check constraint;
 * {@link ApplicationStatusConverter} maps between that and this enum.
 */
public enum ApplicationStatus {
  DISCOVERED("Discovered"),
  SAVED("Saved"),
  APPLIED("Applied"),
  RECRUITER_CONTACTED("Recruiter Contacted"),
  SCREENING("Screening"),
  TECHNICAL_INTERVIEW("Technical Interview"),
  SYSTEM_DESIGN_INTERVIEW("System Design Interview"),
  FINAL_INTERVIEW("Final Interview"),
  OFFER("Offer"),
  REJECTED("Rejected"),
  WITHDRAWN("Withdrawn");

  private final String value;

  ApplicationStatus(String value) {
    this.value = value;
  }

  public String value() {
    return value;
  }

  public boolean isTerminal() {
    return this == REJECTED || this == WITHDRAWN;
  }

  public static ApplicationStatus fromValue(String value) {
    return Arrays.stream(values())
        .filter(status -> status.value.equalsIgnoreCase(value) || status.name().equalsIgnoreCase(value))
        .findFirst()
        .orElseThrow(() -> new IllegalArgumentException("Unknown application status: " + value));
  }
}
