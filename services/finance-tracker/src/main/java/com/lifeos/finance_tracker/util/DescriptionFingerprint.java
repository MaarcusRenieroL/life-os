package com.lifeos.finance_tracker.util;

import java.util.Arrays;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

// Reduces a raw bank description to a stable merchant fingerprint by dropping
// reference-number-like tokens (anything with 3+ digits) and keeping the first
// few remaining words, e.g. "AMZN MKTP IN 4471829" -> "AMZN MKTP IN". Shared
// between categorization-rule learning and merchant-name-correction learning -
// both need the same "what identifies this merchant across statements" logic.
public final class DescriptionFingerprint {

  private static final Pattern NUMERIC_TOKEN = Pattern.compile(".*\\d{3,}.*");
  private static final int FINGERPRINT_TOKEN_COUNT = 3;

  private DescriptionFingerprint() {}

  public static String of(String description) {
    if (description == null) {
      return "";
    }
    return Arrays.stream(description.trim().split("\\s+"))
        .filter(token -> !NUMERIC_TOKEN.matcher(token).matches())
        .limit(FINGERPRINT_TOKEN_COUNT)
        .collect(Collectors.joining(" "))
        .trim();
  }
}
