package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.entity.DiscoveryPreferences;
import com.lifeos.job_tracker.domains.entity.Skill;
import com.lifeos.job_tracker.domains.enums.SeniorityLevel;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

/**
 * Zero-cost triage for discovered openings. A scan can surface thousands of postings, so this reads
 * the posting text against the candidate's skill library with plain pattern matching - no model
 * call. The precise, AI-parsed {@link JobMatchingService} score takes over once a job is promoted.
 *
 * <p>Two rules run in code rather than being left to a model to weigh: a title more than one
 * level above the candidate is capped, and a posting that names none of the candidate's skills is
 * capped. Both mirror gates that kept senior and wrong-field roles from burying real matches in
 * the jobradar prototype this feature grew out of.
 */
@Component
public class DiscoveryScorer {

  public static final int CAP = 30;

  private static final Set<String> SHORT_SKILLS = Set.of("c#", "c++", "js", "ts", "ai", "ml", "qa", "ui", "ux");
  private static final Pattern SEPARATORS = Pattern.compile("[\\s._/-]+");

  private static final Pattern DIRECTOR_LEVEL =
      Pattern.compile("\\b(director|vp|vice president|head of|chief)\\b", Pattern.CASE_INSENSITIVE);
  private static final Pattern PRINCIPAL_LEVEL =
      Pattern.compile("\\b(principal|distinguished|fellow)\\b", Pattern.CASE_INSENSITIVE);
  private static final Pattern STAFF_LEVEL = Pattern.compile("\\bstaff\\b", Pattern.CASE_INSENSITIVE);
  private static final Pattern LEAD_LEVEL =
      Pattern.compile("\\b(lead|leads|manager|architect)\\b", Pattern.CASE_INSENSITIVE);
  private static final Pattern SENIOR_LEVEL =
      Pattern.compile("\\b(senior|sr\\.?)(?=\\W|$)", Pattern.CASE_INSENSITIVE);
  private static final Pattern INTERN_LEVEL =
      Pattern.compile("\\b(intern|internship|apprentice|trainee)\\b", Pattern.CASE_INSENSITIVE);
  private static final Pattern JUNIOR_LEVEL =
      Pattern.compile(
          "\\b(junior|jr\\.?|new ?grad|graduate|entry[- ]level|associate|early career|university|campus)(?=\\W|$)",
          Pattern.CASE_INSENSITIVE);

  public record Result(int score, Map<String, Object> explanation) {}

  /** A candidate's skills and preferences compiled once, then applied to every posting of a scan. */
  public final class Prepared {
    private final List<SkillPattern> patterns;
    private final DiscoveryPreferences prefs;
    private final SeniorityLevel ceiling;
    private final boolean ceilingIsExplicit;
    private final int skillCount;

    private Prepared(List<Skill> skills, DiscoveryPreferences prefs) {
      this.patterns = compile(skills);
      this.prefs = prefs;
      this.skillCount = skills.size();
      this.ceilingIsExplicit = prefs.getMaxSeniority() != null;
      this.ceiling =
          ceilingIsExplicit ? prefs.getMaxSeniority() : JobMatchingService.inferSeniority(skills);
    }

    public boolean passesFilters(String title) {
      return DiscoveryScorer.passesFilters(title, prefs);
    }

    public Result score(String title, String location, String description) {
      String haystack = (title == null ? "" : title) + "\n" + (description == null ? "" : description);
      boolean hasDescription = description != null && description.length() >= 80;

      List<String> matched = new ArrayList<>();
      for (SkillPattern pattern : patterns) {
        if (pattern.regex().matcher(haystack).find()) {
          matched.add(pattern.name());
        }
      }

      double skillFit;
      if (!hasDescription) {
        skillFit = 50; // nothing to judge from - neutral, not a penalty
      } else {
        int denominator = Math.max(3, Math.min(6, skillCount));
        skillFit = Math.min(100.0, 100.0 * matched.size() / denominator);
      }
      double titleFit = titleFit(title);
      double locationFit = locationFit(title, location);

      int score = (int) Math.round(skillFit * 0.65 + titleFit * 0.15 + locationFit * 0.20);
      List<String> caps = new ArrayList<>();

      SeniorityLevel jobLevel = titleSeniority(title);
      if (exceedsCeiling(jobLevel)) {
        score = Math.min(score, CAP);
        caps.add("Title level " + jobLevel + " is above your ceiling of " + ceiling);
      }
      if (hasDescription && matched.isEmpty() && skillCount > 0) {
        score = Math.min(score, CAP);
        caps.add("Posting names none of your skills");
      }

      Map<String, Object> components = new LinkedHashMap<>();
      components.put("skillFit", (int) Math.round(skillFit));
      components.put("titleFit", (int) Math.round(titleFit));
      components.put("locationFit", (int) Math.round(locationFit));

      Map<String, Object> explanation = new LinkedHashMap<>();
      explanation.put("overallFit", score);
      explanation.put("components", components);
      explanation.put("matchedSkills", matched);
      explanation.put("titleSeniority", jobLevel == null ? "UNSPECIFIED" : jobLevel.name());
      explanation.put("caps", caps);
      explanation.put("confidence", hasDescription ? "MEDIUM" : "LOW");
      explanation.put("stage", "DISCOVERY");
      return new Result(Math.max(0, Math.min(100, score)), explanation);
    }

    private boolean exceedsCeiling(SeniorityLevel jobLevel) {
      if (jobLevel == null || ceiling == null) {
        return false;
      }
      // An explicit ceiling is a hard limit. An inferred one is a guess from years of experience,
      // so allow one step of stretch above it.
      int slack = ceilingIsExplicit ? 0 : 1;
      return jobLevel.ordinal() > ceiling.ordinal() + slack;
    }

    private double titleFit(String title) {
      List<String> include = prefs.getTitleInclude();
      if (include == null || include.isEmpty()) {
        return 70;
      }
      return containsAny(title, include) ? 100 : 20;
    }

    private double locationFit(String title, String location) {
      String place = ((location == null ? "" : location) + " " + (title == null ? "" : title)).toLowerCase(Locale.ROOT);
      if (place.contains("remote")) {
        return 100;
      }
      List<String> wanted = prefs.getLocations();
      if (wanted == null || wanted.isEmpty()) {
        return 70;
      }
      return containsAny(place, wanted) ? 100 : 30;
    }
  }

  public Prepared prepare(List<Skill> skills, DiscoveryPreferences prefs) {
    return new Prepared(skills, prefs);
  }

  /** Title include/exclude, applied before a posting is ever stored. */
  public static boolean passesFilters(String title, DiscoveryPreferences prefs) {
    if (title == null || title.isBlank()) {
      return false;
    }
    if (containsAny(title, prefs.getTitleExclude())) {
      return false;
    }
    List<String> include = prefs.getTitleInclude();
    return include == null || include.isEmpty() || containsAny(title, include);
  }

  /** Reads a level off the title alone. A junior marker wins ("Senior Engineer Intern" is an
   * internship) unless the title is a director-level role ("Associate Director"). */
  public static SeniorityLevel titleSeniority(String title) {
    if (title == null || title.isBlank()) {
      return null;
    }
    boolean director = DIRECTOR_LEVEL.matcher(title).find();
    if (!director) {
      if (INTERN_LEVEL.matcher(title).find()) {
        return SeniorityLevel.INTERN;
      }
      if (JUNIOR_LEVEL.matcher(title).find()) {
        return SeniorityLevel.JUNIOR;
      }
    }
    if (director || PRINCIPAL_LEVEL.matcher(title).find()) {
      return SeniorityLevel.PRINCIPAL;
    }
    if (STAFF_LEVEL.matcher(title).find()) {
      return SeniorityLevel.STAFF;
    }
    if (LEAD_LEVEL.matcher(title).find()) {
      return SeniorityLevel.LEAD;
    }
    if (SENIOR_LEVEL.matcher(title).find()) {
      return SeniorityLevel.SENIOR;
    }
    return null;
  }

  private static boolean containsAny(String text, List<String> needles) {
    if (text == null || needles == null) {
      return false;
    }
    String lowered = text.toLowerCase(Locale.ROOT);
    for (String needle : needles) {
      if (needle != null && !needle.isBlank() && lowered.contains(needle.trim().toLowerCase(Locale.ROOT))) {
        return true;
      }
    }
    return false;
  }

  private record SkillPattern(String name, Pattern regex) {}

  private static List<SkillPattern> compile(List<Skill> skills) {
    List<SkillPattern> out = new ArrayList<>();
    for (Skill skill : skills) {
      String name = skill.getName() == null ? "" : skill.getName().trim();
      if (!worthMatching(name)) {
        continue;
      }
      List<String> alternatives = new ArrayList<>();
      alternatives.add(alternative(name));
      String canonical = JobMatchingService.canonicalizeSkillName(name);
      if (worthMatching(canonical) && !canonical.equalsIgnoreCase(SEPARATORS.matcher(name).replaceAll(""))) {
        alternatives.add(alternative(canonical));
      }
      out.add(
          new SkillPattern(
              name,
              Pattern.compile(
                  "(?<![a-z0-9])(?:" + String.join("|", alternatives) + ")(?![a-z0-9])",
                  Pattern.CASE_INSENSITIVE)));
    }
    return out;
  }

  /** "Next.js", "next js" and "NextJS" all read as the same skill. */
  private static String alternative(String name) {
    String[] words = SEPARATORS.split(name.toLowerCase(Locale.ROOT));
    List<String> quoted = new ArrayList<>();
    for (String word : words) {
      if (!word.isEmpty()) {
        quoted.add(Pattern.quote(word));
      }
    }
    return String.join("[\\s._/-]*", quoted);
  }

  /** Two-letter names like "Go" or "R" would match ordinary prose, so only a known allowlist of
   * short technical terms is searched for. */
  private static boolean worthMatching(String name) {
    if (name == null) {
      return false;
    }
    String lowered = name.trim().toLowerCase(Locale.ROOT);
    if (SHORT_SKILLS.contains(lowered)) {
      return true;
    }
    return lowered.replaceAll("[^a-z0-9]", "").length() >= 3;
  }
}
