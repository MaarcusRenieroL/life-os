package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.record.EmailClassification;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * LinkedIn's "your application was sent" confirmations have a fixed shape, so they are read
 * directly instead of being sent through a language model: faster, free, and not at the mercy of a
 * small local model that crashes under load.
 *
 * <p>Two subject forms exist: {@code "<Name>, your application was sent to <Company>"} (the body
 * then carries the job title on its own line) and {@code "Your application to <Title> at
 * <Company>"}. Anything else - rejections, interview invites, digests - still goes to the model.
 */
public final class LinkedInEmailRules {

  private static final Pattern SENT_TO =
      Pattern.compile("your application was sent to\\s+(.+?)\\s*$", Pattern.CASE_INSENSITIVE);
  private static final Pattern TITLE_AT_COMPANY =
      Pattern.compile("your application to\\s+(.+?)\\s+at\\s+(.+?)\\s*$", Pattern.CASE_INSENSITIVE);

  private LinkedInEmailRules() {}

  public static Optional<EmailClassification> classify(String fromAddress, String subject, String body) {
    if (fromAddress == null || subject == null || !fromAddress.toLowerCase().contains("@linkedin.com")) {
      return Optional.empty();
    }
    String cleanSubject = subject.replaceAll("\\s+", " ").trim();

    Matcher sentTo = SENT_TO.matcher(cleanSubject);
    if (sentTo.find()) {
      String company = sentTo.group(1);
      return Optional.of(confirmation(company, titleFromBody(body, company)));
    }

    Matcher titleAtCompany = TITLE_AT_COMPANY.matcher(cleanSubject);
    if (titleAtCompany.find()) {
      return Optional.of(confirmation(titleAtCompany.group(2), titleAtCompany.group(1)));
    }
    return Optional.empty();
  }

  private static EmailClassification confirmation(String company, String title) {
    return new EmailClassification("APPLICATION_CONFIRMATION", "HIGH", company.trim(), title, null);
  }

  /**
   * The line right under the "Your application was sent to X" headline, e.g. "Back End Developer".
   * Null when the body doesn't have that shape (the job then reads as "Untitled role", which the
   * user can fix, rather than a wrong guess).
   */
  private static String titleFromBody(String body, String company) {
    if (body == null) {
      return null;
    }
    Matcher headline = Pattern.compile("your application was sent to[^\\r\\n]*", Pattern.CASE_INSENSITIVE).matcher(body);
    if (!headline.find()) {
      return null;
    }
    for (String line : body.substring(headline.end()).split("\\R")) {
      String candidate = line.replaceAll("\\s+", " ").trim();
      if (candidate.isEmpty()) {
        continue;
      }
      // The company/location line ("Meetswap · India (Remote)") means the title line was missing.
      if (candidate.contains("·") || candidate.toLowerCase().startsWith(company.toLowerCase())) {
        return null;
      }
      return candidate.length() > 200 ? null : candidate;
    }
    return null;
  }
}
