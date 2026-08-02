package com.lifeos.batches.service;

import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

// Turns raw bank narration text ("UPI/DR/618062840396/M S
// JOLEN/ICIC/**39337@ICICI/UPI//AXI31E2EAD962E54AF0BCB60C2F0A910013/29/06/2026
// 20:07:34") into something readable ("M S Jolen"). UPI payee names are
// often truncated to fit a fixed-length VPA-derived field (e.g. "SWIGGYLI",
// "SWIGGYIN" for "Swiggy"), so a short list of common merchants is matched
// as a prefix and normalized to the real name where recognized.
public final class MerchantNameNormalizer {

  private static final Pattern UPI_PAYEE = Pattern.compile("^UPI/(?:DR|CR)/\\d+/([^/]+)/", Pattern.CASE_INSENSITIVE);
  // HDFC-style narration reads "UPI-<payee name><psp/bank code stuff>" instead
  // of Canara's slash-delimited "UPI/DR/.../name/..." - the payee name is
  // whatever alphabetic (+space) run follows "UPI-" (and an optional
  // "AUTOPAY-" for recurring mandates), up to the first character that isn't
  // a letter or space, which is reliably where the VPA/bank-code junk starts.
  private static final Pattern UPI_DASH_PAYEE =
      Pattern.compile("^UPI-(?:AUTOPAY-)?([A-Za-z][A-Za-z ]*)", Pattern.CASE_INSENSITIVE);
  private static final Pattern SI_PAYEE = Pattern.compile("^SI\\s+\\S+\\s+([A-Za-z][A-Za-z ]*)", Pattern.CASE_INSENSITIVE);
  // ATM withdrawals ("ATW-<card>-<terminal id>-<location>") carry no payee at
  // all, just card/terminal codes that dropNoiseTokens would strip entirely
  // (they're one hyphenated blob containing a 6+ digit run, so the whole
  // token disappears, leaving only a stray continuation-line fragment as the
  // "name") - recognized and labeled directly instead.
  private static final Pattern ATM_WITHDRAWAL = Pattern.compile("^ATW-", Pattern.CASE_INSENSITIVE);
  private static final Pattern LEADING_TRANSFER_PREFIX =
      Pattern.compile("^(NACH|ECS|ACH|NEFT|IMPS|RTGS)\\s+", Pattern.CASE_INSENSITIVE);
  private static final Pattern LONG_DIGIT_RUN = Pattern.compile("\\d{6,}");
  private static final Pattern BARE_DATE = Pattern.compile("\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4}");
  private static final Pattern BARE_TIME = Pattern.compile("\\d{1,2}:\\d{2}(:\\d{2})?");
  private static final Pattern ENTITY_SUFFIX =
      Pattern.compile(
          "(?i)\\s+(finance|services|limited|ltd|pvt|private|technologies|solutions|co|inc|corp|llc)$");

  private static final List<String> KNOWN_BRANDS =
      List.of(
          "SWIGGY", "ZOMATO", "AMAZON", "FLIPKART", "ZEPTO", "BLINKIT", "MYNTRA", "UBER", "OLA",
          "NETFLIX", "SPOTIFY", "AIRTEL", "JIO", "PAYTM", "PHONEPE", "GOOGLE", "APPLE", "IRCTC",
          "BOOKMYSHOW", "BIGBASKET", "DMART", "RAPIDO", "HOTSTAR", "OLAMONEY");

  private MerchantNameNormalizer() {}

  public static String normalize(String rawDescription) {
    if (rawDescription == null || rawDescription.isBlank()) {
      return "Unknown transaction";
    }

    String text = rawDescription.trim().replaceAll("\\s+", " ");
    if (ATM_WITHDRAWAL.matcher(text).find()) {
      return "ATM Withdrawal";
    }

    var upiMatch = UPI_PAYEE.matcher(text);
    var upiDashMatch = UPI_DASH_PAYEE.matcher(text);
    var siMatch = SI_PAYEE.matcher(text);
    String candidate;
    if (upiMatch.find()) {
      candidate = upiMatch.group(1);
    } else if (upiDashMatch.find()) {
      candidate = upiDashMatch.group(1);
    } else if (siMatch.find()) {
      candidate = siMatch.group(1);
    } else {
      candidate = text;
    }

    candidate = LEADING_TRANSFER_PREFIX.matcher(candidate).replaceFirst("");
    candidate = dropNoiseTokens(candidate);
    // Suffixes can chain (e.g. "X Pvt Ltd" -> "X Pvt" -> "X"), so keep stripping
    // until nothing more matches.
    String beforeSuffixStrip;
    do {
      beforeSuffixStrip = candidate;
      candidate = ENTITY_SUFFIX.matcher(candidate).replaceAll("");
    } while (!candidate.equals(beforeSuffixStrip));
    candidate = candidate.replaceAll("\\s+", " ").trim();

    if (candidate.isBlank()) {
      candidate = dropNoiseTokens(text);
    }
    if (candidate.isBlank()) {
      candidate = text;
    }

    String upper = candidate.toUpperCase(Locale.ROOT).replace(" ", "");
    for (String brand : KNOWN_BRANDS) {
      if (upper.startsWith(brand)) {
        candidate = brand;
        break;
      }
    }

    if (candidate.length() > 60) {
      candidate = candidate.substring(0, 60).trim();
    }

    return titleCase(candidate);
  }

  // Strips reference-number-like tokens (anything with a 6+ digit run) and
  // bare date/time tokens, which is most of the noise in bank narration text.
  private static String dropNoiseTokens(String text) {
    StringBuilder result = new StringBuilder();
    for (String token : text.split("\\s+")) {
      if (token.isBlank()) continue;
      if (LONG_DIGIT_RUN.matcher(token).find()) continue;
      if (BARE_DATE.matcher(token).matches()) continue;
      if (BARE_TIME.matcher(token).matches()) continue;
      if (token.equalsIgnoreCase("Chq:") || token.equalsIgnoreCase("Chq")) continue;
      if (!result.isEmpty()) result.append(' ');
      result.append(token);
    }
    return result.toString().trim();
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
