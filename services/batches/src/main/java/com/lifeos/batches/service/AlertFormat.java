package com.lifeos.batches.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.Instant;
import java.util.List;

/** Shared number/date handling for the bank-alert parsers. */
final class AlertFormat {

  /** Amounts as banks print them: {@code 1,25,000.00}, {@code 499}, {@code 12.5}. */
  static final String AMOUNT = "[\\d,]+(?:\\.\\d+)?";

  private static final List<DateTimeFormatter> DATES =
      List.of(
          DateTimeFormatter.ofPattern("dd-MM-yy"),
          DateTimeFormatter.ofPattern("dd-MM-yyyy"),
          DateTimeFormatter.ofPattern("dd/MM/yy"),
          DateTimeFormatter.ofPattern("dd/MM/yyyy"));

  private static final ZoneId IST = ZoneId.of("Asia/Kolkata");

  private AlertFormat() {}

  static BigDecimal amount(String raw) {
    return new BigDecimal(raw.replace(",", ""));
  }

  /** Midnight IST of a date written in any of the formats the banks use. */
  static Instant date(String raw) {
    for (DateTimeFormatter format : DATES) {
      try {
        return LocalDate.parse(raw, format).atStartOfDay(IST).toInstant();
      } catch (DateTimeParseException ignored) {
        // try the next format
      }
    }
    throw new IllegalStateException("Unrecognised date in bank alert: " + raw);
  }

  /** Thrown when an alert from a known bank doesn't look like any format we understand. */
  static IllegalStateException unparsed(String fromAddress, String subject) {
    return new IllegalStateException(
        "Alert from " + fromAddress + " (\"" + subject + "\") did not match any known format");
  }
}
