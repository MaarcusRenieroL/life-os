package com.lifeos.job_tracker.integration;

import com.lifeos.job_tracker.exception.JobLinkUnreadableException;
import lombok.RequiredArgsConstructor;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

/**
 * Fetches a pasted job URL server-side and reduces the HTML to text the AI can parse: any
 * {@code application/ld+json} blocks first (clean, structured), then the visible body text.
 *
 * <p>LinkedIn / Naukri / Indeed and other SPA job boards often answer a bare server request with a
 * login wall, a bot check, or an empty JS shell - when the result has no usable job content we
 * raise {@link JobLinkUnreadableException} so the caller can fall back to asking the user to paste
 * the description.
 */
@Component
@RequiredArgsConstructor
public class JobLinkFetcher {

  private static final Logger log = LoggerFactory.getLogger(JobLinkFetcher.class);

  private static final String USER_AGENT =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
          + " (KHTML, like Gecko) Chrome/125.0 Safari/537.36";
  private static final int MAX_TEXT_CHARS = 24_000;

  private final RestClient.Builder restClientBuilder;

  public record FetchedPage(String url, String content) {}

  public FetchedPage fetch(String url) {
    String html;
    try {
      html =
          restClientBuilder
              .build()
              .get()
              .uri(url)
              .header("User-Agent", USER_AGENT)
              .header("Accept", "text/html,application/xhtml+xml")
              .header("Accept-Language", "en-US,en;q=0.9")
              .retrieve()
              .body(String.class);
    } catch (RestClientResponseException exception) {
      log.warn("job link fetch for {} returned {}", url, exception.getStatusCode());
      throw new JobLinkUnreadableException(
          "That link returned " + exception.getStatusCode().value() + ". Open the posting, copy its"
              + " description, and paste it below.");
    } catch (RestClientException exception) {
      log.warn("job link fetch failed for {}: {}", url, rootMessage(exception));
      throw new JobLinkUnreadableException(
          "Couldn't open that link (" + rootMessage(exception) + "). Paste the job description text"
              + " instead.");
    }

    if (html == null || html.isBlank()) {
      throw new JobLinkUnreadableException(
          "That link returned an empty page. Paste the job description text instead.");
    }

    Document doc = Jsoup.parse(html, url);

    StringBuilder out = new StringBuilder();
    for (Element ld : doc.select("script[type=application/ld+json]")) {
      String json = ld.data().trim();
      if (json.contains("JobPosting") || json.contains("\"datePosted\"")) {
        out.append("--- JSON-LD ---\n").append(truncate(json, 12_000)).append("\n\n");
      }
    }

    doc.select("script, style, noscript, svg, nav, footer, header, form, iframe").remove();
    Element main = doc.selectFirst("main, article, [role=main], .content, #content");
    String text = (main != null ? main : doc.body() != null ? doc.body() : doc).text();
    text = truncate(text, MAX_TEXT_CHARS);
    out.append("--- PAGE TEXT ---\n").append(text);

    String lower = text.toLowerCase();
    boolean looksWalled =
        text.length() < 500
            && (lower.contains("sign in")
                || lower.contains("log in")
                || lower.contains("enable javascript")
                || lower.contains("verify you are")
                || lower.contains("captcha"));
    if (looksWalled || text.isBlank()) {
      throw new JobLinkUnreadableException(
          "That site (LinkedIn / Naukri / Indeed and similar) blocks automated reads or needs"
              + " JavaScript. Open the posting, copy its description, and paste it below.");
    }

    return new FetchedPage(url, out.toString());
  }

  private static String truncate(String s, int max) {
    return s.length() > max ? s.substring(0, max) : s;
  }

  private static String rootMessage(Throwable t) {
    Throwable root = t;
    while (root.getCause() != null && root.getCause() != root) {
      root = root.getCause();
    }
    String message = root.getMessage();
    if (message == null) {
      return root.getClass().getSimpleName();
    }
    return message.length() > 120 ? message.substring(0, 120) : message;
  }
}
