package com.lifeos.core.automation;

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Fills {{placeholders}} in a rule's text ("Follow up on {{title}}") from the triggering item.
 * Unknown placeholders render as empty rather than leaking the raw braces into a task title. */
public final class TemplateRenderer {

  private static final Pattern PLACEHOLDER = Pattern.compile("\\{\\{\\s*([a-zA-Z0-9_]+)\\s*}}");

  private TemplateRenderer() {}

  public static String render(String template, Map<String, String> vars) {
    if (template == null) return null;
    Matcher matcher = PLACEHOLDER.matcher(template);
    StringBuilder out = new StringBuilder();
    while (matcher.find()) {
      String value = vars.get(matcher.group(1));
      matcher.appendReplacement(out, Matcher.quoteReplacement(value == null ? "" : value));
    }
    matcher.appendTail(out);
    return out.toString().strip();
  }
}
