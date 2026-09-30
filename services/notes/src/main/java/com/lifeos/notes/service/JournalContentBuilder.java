package com.lifeos.notes.service;

import java.util.List;
import java.util.Map;

/** Renders a journal entry's structured fields into the HTML the notes editor/list/search work
 * with. Every piece of user text is HTML-escaped: notes content is loaded straight into the
 * editor's innerHTML, so raw user text here would be a stored-XSS hole. */
public final class JournalContentBuilder {

  private JournalContentBuilder() {}

  public static String build(List<Map<String, String>> prompts, String freeWriting) {
    StringBuilder html = new StringBuilder();
    for (Map<String, String> entry : prompts) {
      String answer = entry.get("answer");
      if (answer == null || answer.isBlank()) continue;
      html.append("<h3>").append(escape(entry.get("prompt"))).append("</h3>").append(paragraphs(answer));
    }
    if (freeWriting != null && !freeWriting.isBlank()) {
      if (!html.isEmpty()) html.append("<h3>Free writing</h3>");
      html.append(paragraphs(freeWriting));
    }
    return html.toString();
  }

  /** Blank-line-separated blocks become paragraphs; single newlines inside one become line breaks. */
  static String paragraphs(String text) {
    StringBuilder html = new StringBuilder();
    for (String block : text.strip().split("\\n\\s*\\n")) {
      if (block.isBlank()) continue;
      html.append("<p>").append(escape(block.strip()).replace("\n", "<br>")).append("</p>");
    }
    return html.toString();
  }

  static String escape(String text) {
    if (text == null) return "";
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;").replace("'", "&#39;");
  }
}
