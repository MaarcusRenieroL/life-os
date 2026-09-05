package com.lifeos.job_tracker.integration;

import com.lifeos.job_tracker.domains.record.SectionView;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

/**
 * Renders a resume's typed sections (experience, education, skills, ...) to Markdown so they can
 * go through {@link ResumePdfWriter} - the one PDF renderer this service has, reused for every
 * document (uploaded-resume tailoring, resume-variant export, cover letters).
 */
@Component
public class ResumeSectionRenderer {

  public String toMarkdown(List<SectionView> sections) {
    StringBuilder markdown = new StringBuilder();
    for (SectionView section : sections) {
      if (section.content() == null || section.content().isEmpty()) {
        continue;
      }
      markdown
          .append("## ")
          .append(section.title() != null ? section.title() : humanize(section.sectionType()))
          .append("\n\n");

      for (Object rawEntry : section.content()) {
        markdown.append(renderEntry(section.sectionType(), rawEntry)).append("\n");
      }
      markdown.append("\n");
    }
    return markdown.toString();
  }

  @SuppressWarnings("unchecked")
  private String renderEntry(String sectionType, Object rawEntry) {
    if (!(rawEntry instanceof Map<?, ?> rawMap)) {
      return "- " + rawEntry;
    }
    Map<String, Object> entry = (Map<String, Object>) rawMap;
    String type = sectionType == null ? "" : sectionType;

    return switch (type) {
      case "EXPERIENCE" ->
          heading(field(entry, "position", "title"), field(entry, "company"))
              + subline(field(entry, "location"), dateRange(entry))
              + bullets(entry.get("bullets"))
              + textLine(field(entry, "description"));
      case "EDUCATION" ->
          heading(field(entry, "degree"), field(entry, "institution", "school"))
              + subline(field(entry, "field"), field(entry, "graduationDate", "graduationYear"))
              + bullets(entry.get("highlights"));
      case "PROJECTS" ->
          heading(field(entry, "name"), field(entry, "date"))
              + textLine(field(entry, "description"))
              + bullets(entry.get("bullets"))
              + textLine(joinList(entry.get("technologies")));
      case "CERTIFICATIONS" ->
          heading(field(entry, "name"), field(entry, "issuer"))
              + subline(field(entry, "issueDate"), null);
      case "VOLUNTEER" ->
          heading(field(entry, "role"), field(entry, "organization"))
              + subline(null, dateRange(entry))
              + textLine(field(entry, "description"))
              + bullets(entry.get("bullets"));
      case "LANGUAGES" -> "- " + field(entry, "language") + " (" + field(entry, "proficiency") + ")\n";
      case "SUMMARY" -> textLine(field(entry, "text"));
      case "SKILLS" -> skills(entry);
      default -> "- " + entry;
    };
  }

  private static String heading(String primary, String secondary) {
    if (primary == null && secondary == null) {
      return "";
    }
    return "**" + (primary == null ? "" : primary) + (secondary == null ? "" : " - " + secondary) + "**\n";
  }

  private static String subline(String left, String right) {
    if (left == null && right == null) {
      return "";
    }
    return "*" + (left == null ? "" : left) + (left != null && right != null ? " · " : "")
        + (right == null ? "" : right) + "*\n";
  }

  private static String textLine(String text) {
    return text == null || text.isBlank() ? "" : text + "\n";
  }

  @SuppressWarnings("unchecked")
  private static String bullets(Object rawBullets) {
    if (!(rawBullets instanceof List<?> list) || list.isEmpty()) {
      return "";
    }
    StringBuilder builder = new StringBuilder();
    for (Object bullet : list) {
      builder.append("- ").append(bullet).append("\n");
    }
    return builder.toString();
  }

  private static String skills(Map<String, Object> entry) {
    String category = field(entry, "category");
    Object skills = entry.get("skills");
    String joined =
        skills instanceof List<?> list
            ? list.stream().map(ResumeSectionRenderer::skillLabel).reduce((a, b) -> a + ", " + b).orElse("")
            : "";
    return "- " + (category != null ? category + ": " : "") + joined + "\n";
  }

  @SuppressWarnings("unchecked")
  private static String skillLabel(Object rawSkill) {
    if (rawSkill instanceof Map<?, ?> map) {
      Object name = map.get("name");
      return name == null ? String.valueOf(map) : String.valueOf(name);
    }
    return String.valueOf(rawSkill);
  }

  private static String dateRange(Map<String, Object> entry) {
    String start = field(entry, "startDate");
    String end = field(entry, "endDate");
    if (start == null && end == null) {
      return null;
    }
    return (start == null ? "" : start) + " - " + (end == null || end.isBlank() ? "Present" : end);
  }

  private static String joinList(Object rawList) {
    if (!(rawList instanceof List<?> list) || list.isEmpty()) {
      return null;
    }
    return list.stream().map(String::valueOf).reduce((a, b) -> a + ", " + b).orElse(null);
  }

  private static String field(Map<String, Object> entry, String... candidateKeys) {
    for (String key : candidateKeys) {
      Object value = entry.get(key);
      if (value != null && !String.valueOf(value).isBlank()) {
        return String.valueOf(value);
      }
    }
    return null;
  }

  private static String humanize(String sectionType) {
    if (sectionType == null) {
      return "";
    }
    String lower = sectionType.toLowerCase().replace('_', ' ');
    return Character.toUpperCase(lower.charAt(0)) + lower.substring(1);
  }
}
