package com.lifeos.finance_tracker.util;

import java.util.Locale;
import java.util.regex.Pattern;

// Cleans up a raw transaction description into a display-friendly merchant
// name for a brand-new merchant record - e.g. "Loyola Co" -> "Loyola", "MADRAS
// FRIEN..." stays as-is (nothing to strip). Only strips generic legal-entity
// suffixes; it can't know a person's full name from a truncated bank
// narration (e.g. "Maarcus R S" -> "Maarcus Reniero") - that kind of
// correction goes through MerchantService#rename instead, which is built for
// exactly this and remembers it as an alias for future imports.
public final class MerchantNameNormalizer {

  private static final Pattern ENTITY_SUFFIX =
      Pattern.compile(
          "(?i)\\s+(co|co\\.|inc|inc\\.|corp|corp\\.|llc|ltd|ltd\\.|pvt|pvt\\.|private|limited)$");

  // UPI payee strings pulled straight from bank alert emails are often just
  // the VPA ("Playstore1.bd@axisbank", "Cumta.hypg@yespay") - the "@bank/psp"
  // half is payment-rail plumbing, not part of the merchant's identity.
  private static final Pattern UPI_HANDLE_SUFFIX = Pattern.compile("@[A-Za-z0-9.]+$");

  private MerchantNameNormalizer() {}

  public static String normalize(String rawDescription) {
    if (rawDescription == null || rawDescription.isBlank()) {
      return rawDescription;
    }

    String candidate = UPI_HANDLE_SUFFIX.matcher(rawDescription.trim()).replaceAll("");
    candidate = candidate.replaceAll("\\s+", " ").trim();
    if (candidate.isBlank()) {
      candidate = rawDescription.trim();
    }

    // Suffix-stripping can chain (e.g. "X Pvt Co" -> "X Pvt" -> "X"), so keep
    // applying it until nothing more matches.
    String stripped;
    do {
      stripped = candidate;
      candidate = ENTITY_SUFFIX.matcher(candidate).replaceAll("");
    } while (!candidate.equals(stripped));

    return candidate.isBlank() ? rawDescription : titleCase(candidate);
  }

  private static String titleCase(String text) {
    String[] words = text.toLowerCase(Locale.ROOT).split("\\s+");
    StringBuilder result = new StringBuilder();
    for (String word : words) {
      if (word.isEmpty()) continue;
      if (!result.isEmpty()) result.append(' ');
      result.append(Character.toUpperCase(word.charAt(0))).append(word.substring(1));
    }
    return result.isEmpty() ? text : result.toString();
  }
}
