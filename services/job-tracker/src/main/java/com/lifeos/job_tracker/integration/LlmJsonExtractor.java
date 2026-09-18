package com.lifeos.job_tracker.integration;

/** Pulls the JSON object/array out of a chat model's reply, tolerating a ```json fence or stray
 * prose around it - shared by every {@link AiClient} implementation since every provider does
 * this the same way. */
final class LlmJsonExtractor {

  private LlmJsonExtractor() {}

  static String extract(String text) {
    String trimmed = text.trim();

    int fence = trimmed.indexOf("```");
    if (fence >= 0) {
      int start = trimmed.indexOf('\n', fence);
      int end = trimmed.lastIndexOf("```");
      if (start > 0 && end > start) {
        trimmed = trimmed.substring(start + 1, end).trim();
      }
    }

    int firstBrace = trimmed.indexOf('{');
    int firstBracket = trimmed.indexOf('[');
    int start =
        (firstBracket >= 0 && (firstBrace < 0 || firstBracket < firstBrace)) ? firstBracket : firstBrace;
    int lastBrace = trimmed.lastIndexOf('}');
    int lastBracket = trimmed.lastIndexOf(']');
    int end = Math.max(lastBrace, lastBracket);

    return (start >= 0 && end > start) ? trimmed.substring(start, end + 1) : trimmed;
  }
}
