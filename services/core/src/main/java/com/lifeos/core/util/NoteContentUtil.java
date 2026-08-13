package com.lifeos.core.util;

import java.util.regex.Pattern;

// The rich-text editor (PrimeNG Editor/Quill) stores note content as HTML.
// Plain-text extraction here is a lightweight tag-stripping pass rather than
// pulling in a full HTML parser (Jsoup) - the notes module has no other need
// for DOM-aware parsing, so a regex pass keeps the dependency footprint down
// for what is otherwise a one-line concern.
public final class NoteContentUtil {

  private static final Pattern TAG_PATTERN = Pattern.compile("<[^>]+>");
  private static final Pattern WHITESPACE_PATTERN = Pattern.compile("\\s+");

  private NoteContentUtil() {}

  public static String toPlainText(String html) {
    if (html == null || html.isBlank()) {
      return "";
    }

    String withoutTags = TAG_PATTERN.matcher(html).replaceAll(" ");
    String decoded =
        withoutTags
            .replace("&nbsp;", " ")
            .replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&quot;", "\"")
            .replace("&#39;", "'");

    return WHITESPACE_PATTERN.matcher(decoded).replaceAll(" ").trim();
  }

  public static int wordCount(String plainText) {
    if (plainText == null || plainText.isBlank()) {
      return 0;
    }

    return plainText.trim().split("\\s+").length;
  }

  public static int readingTimeMinutes(int wordCount) {
    return Math.max(1, (int) Math.ceil(wordCount / 200.0));
  }

  public static String excerpt(String plainText, int maxLength) {
    if (plainText == null) {
      return "";
    }

    if (plainText.length() <= maxLength) {
      return plainText;
    }

    return plainText.substring(0, maxLength).trim() + "...";
  }
}
