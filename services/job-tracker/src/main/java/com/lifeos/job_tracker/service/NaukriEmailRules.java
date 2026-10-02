package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.record.EmailClassification;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * Naukri's "You applied for N jobs on <date>" email shows the first application (title, then
 * company, right under "Applied on <date>") followed by recommended jobs. The remaining N-1 are not
 * in the email, so those come from the "Import applied jobs" flow; this just catches the first one
 * automatically, without a language model.
 */
public final class NaukriEmailRules {

  private static final Pattern SUBJECT = Pattern.compile("^\\s*you applied for \\d+ jobs? on\\b.*", Pattern.CASE_INSENSITIVE);
  private static final Pattern APPLIED_ON = Pattern.compile("^applied on\\b.*", Pattern.CASE_INSENSITIVE);

  private NaukriEmailRules() {}

  public static Optional<EmailClassification> classify(String fromAddress, String subject, String body) {
    if (fromAddress == null || subject == null || body == null || !fromAddress.toLowerCase().contains("naukri.com")) {
      return Optional.empty();
    }
    if (!SUBJECT.matcher(subject).matches()) {
      return Optional.empty();
    }
    List<String> lines = textLines(body);
    for (int i = 0; i < lines.size() - 2; i++) {
      if (APPLIED_ON.matcher(lines.get(i)).matches()) {
        String title = lines.get(i + 1);
        String company = lines.get(i + 2);
        if (title.length() > 200 || company.length() > 200 || "Track applications".equalsIgnoreCase(company)) {
          return Optional.empty();
        }
        return Optional.of(new EmailClassification("APPLICATION_CONFIRMATION", "HIGH", company, title, null));
      }
    }
    return Optional.empty();
  }

  /** The visible text of an email body, one non-empty line per block (HTML or plain). */
  static List<String> textLines(String body) {
    String text =
        body.replaceAll("(?is)<(script|style)[^>]*>.*?</\\1>", " ")
            .replaceAll("(?i)<br\\s*/?>|</(p|div|tr|td|th|li|h[1-6]|table)>", "\n")
            .replaceAll("<[^>]+>", " ")
            .replace("&nbsp;", " ")
            .replace("&amp;", "&");
    List<String> lines = new ArrayList<>();
    for (String raw : text.split("\\R")) {
      String line = raw.replaceAll("[\\s\\u00a0]+", " ").trim();
      if (!line.isEmpty()) {
        lines.add(line);
      }
    }
    return lines;
  }
}
