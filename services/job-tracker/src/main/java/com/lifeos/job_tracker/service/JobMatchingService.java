package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.entity.JobListing;
import com.lifeos.job_tracker.domains.entity.Skill;
import com.lifeos.job_tracker.domains.enums.SeniorityLevel;
import com.lifeos.job_tracker.domains.enums.VisaSponsorship;
import com.lifeos.job_tracker.domains.enums.WorkModel;
import com.lifeos.job_tracker.integration.AiAssistant;
import com.lifeos.job_tracker.repository.SkillRepository;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Deterministic, explainable job-fit scoring. The components and weights follow the spec's section
 * 4.1; each sub-score is 0..100 and the final score is their weighted average.
 */
@Service
@RequiredArgsConstructor
public class JobMatchingService {

  private static final Logger log = LoggerFactory.getLogger(JobMatchingService.class);

  private final SkillRepository skillRepository;
  private final AiAssistant ai;

  public record JobFitResult(int score, Map<String, Object> explanation) {}

  @Transactional(readOnly = true)
  public JobFitResult score(UUID userId, JobListing job) {
    return score(job, skillRepository.findAllByUserIdOrderByNameAsc(userId));
  }

  /** Scores against an explicit skill set rather than the persisted library - used to rescore a
   * job against one specific tailored-resume version instead of the candidate's whole history. */
  public JobFitResult score(JobListing job, List<Skill> skills) {
    Set<String> userSkillNames =
        skills.stream().map(s -> normalise(s.getName())).collect(Collectors.toSet());

    List<String> required = safe(job.getRequiredSkills());
    List<String> niceToHave = safe(job.getNiceToHaveSkills());

    List<String> strong = new ArrayList<>();
    List<String> partial = new ArrayList<>();
    List<String> missing = new ArrayList<>();
    for (String req : required) {
      String norm = normalise(req);
      if (userSkillNames.contains(norm)) {
        strong.add(req);
      } else if (userSkillNames.stream().anyMatch(u -> u.contains(norm) || norm.contains(u))) {
        partial.add(req);
      } else {
        missing.add(req);
      }
    }
    applySemanticMatches(missing, partial, skills);

    double skillMatch =
        required.isEmpty() ? 60.0 : 100.0 * (strong.size() + 0.5 * partial.size()) / required.size();
    long niceHits =
        niceToHave.stream()
            .filter(n -> userSkillNames.stream().anyMatch(u -> u.contains(normalise(n)) || normalise(n).contains(u)))
            .count();
    double niceMatch = niceToHave.isEmpty() ? 70.0 : 100.0 * niceHits / niceToHave.size();

    SeniorityLevel userLevel = inferSeniority(skills);
    double seniorityFit = seniorityFit(userLevel, job.getSeniorityLevel());
    double locationFit = job.getWorkModel() == WorkModel.REMOTE ? 100 : job.getWorkModel() == null ? 65 : 55;
    double salaryFit = (job.getSalaryMin() != null || job.getSalaryMax() != null) ? 80 : 60;
    double visaFit =
        switch (job.getVisaSponsorship() == null ? VisaSponsorship.UNKNOWN : job.getVisaSponsorship()) {
          case YES -> 100;
          case UNKNOWN -> 70;
          case NO -> 40;
        };

    double weighted =
        skillMatch * 0.45
            + niceMatch * 0.10
            + seniorityFit * 0.15
            + locationFit * 0.10
            + salaryFit * 0.10
            + visaFit * 0.10;
    int score = (int) Math.round(Math.max(0, Math.min(100, weighted)));

    Map<String, Object> components = new LinkedHashMap<>();
    components.put("skillMatch", round(skillMatch));
    components.put("niceToHaveMatch", round(niceMatch));
    components.put("seniorityFit", round(seniorityFit));
    components.put("locationFit", round(locationFit));
    components.put("salaryFit", round(salaryFit));
    components.put("visaFit", round(visaFit));

    Map<String, Object> explanation = new LinkedHashMap<>();
    explanation.put("overallFit", score);
    explanation.put("components", components);
    explanation.put("strongMatches", strong);
    explanation.put("partialMatches", partial);
    explanation.put("missingSkills", missing);
    explanation.put("inferredSeniority", userLevel == null ? "UNKNOWN" : userLevel.name());
    explanation.put("redFlags", redFlags(job));
    explanation.put(
        "confidence",
        required.isEmpty() && (job.getJobDescriptionText() == null) ? "LOW" : required.isEmpty() ? "MEDIUM" : "HIGH");

    return new JobFitResult(score, explanation);
  }

  /**
   * After alias-based matching, whatever's left in {@code missing} might still be a real skill the
   * candidate has under wording the static alias table doesn't cover (e.g. "container
   * orchestration" vs "Kubernetes"). One Claude/Ollama call per scoring pass (not per skill) checks
   * the leftovers; anything it confirms moves from {@code missing} to {@code partial} - treated as
   * partial credit, not a strong match, since it's an inferred equivalence rather than an exact or
   * substring match. Mutates both lists in place. Best-effort: a failed AI call just leaves the
   * alias-only result in place rather than failing the whole score.
   */
  private void applySemanticMatches(List<String> missing, List<String> partial, List<Skill> skills) {
    if (missing.isEmpty()) {
      return;
    }
    List<String> candidateSkillNames = skills.stream().map(Skill::getName).toList();
    try {
      List<String> matched = ai.semanticSkillMatch(missing, candidateSkillNames);
      if (matched == null || matched.isEmpty()) {
        return;
      }
      Set<String> matchedSet = Set.copyOf(matched);
      missing.removeIf(matchedSet::contains);
      partial.addAll(matched);
    } catch (RuntimeException exception) {
      log.warn("Semantic skill match failed, falling back to alias-only result: {}", exception.getMessage());
    }
  }

  private static List<String> redFlags(JobListing job) {
    List<String> flags = new ArrayList<>();
    if (job.getVisaSponsorship() == VisaSponsorship.NO) {
      flags.add("No visa sponsorship");
    }
    if (job.getSalaryMin() == null && job.getSalaryMax() == null) {
      flags.add("Salary not disclosed");
    }
    if (job.getJobDescriptionText() == null || job.getJobDescriptionText().isBlank()) {
      flags.add("No job description to score against");
    }
    return flags;
  }

  private static SeniorityLevel inferSeniority(List<Skill> skills) {
    double maxYears =
        skills.stream()
            .map(Skill::getYearsOfExperience)
            .filter(y -> y != null)
            .mapToDouble(BigDecimal::doubleValue)
            .max()
            .orElse(0);
    if (maxYears == 0) {
      return null;
    }
    if (maxYears < 2) {
      return SeniorityLevel.JUNIOR;
    }
    if (maxYears < 5) {
      return SeniorityLevel.MID;
    }
    if (maxYears < 8) {
      return SeniorityLevel.SENIOR;
    }
    return SeniorityLevel.STAFF;
  }

  private static double seniorityFit(SeniorityLevel user, SeniorityLevel job) {
    if (user == null || job == null) {
      return 70;
    }
    int delta = user.ordinal() - job.ordinal();
    if (delta == 0) {
      return 100;
    }
    if (delta > 0) {
      return Math.max(70, 100 - delta * 10); // overqualified
    }
    return Math.max(30, 90 + delta * 20); // underqualified drops faster
  }

  private static List<String> safe(List<String> list) {
    return list == null ? List.of() : list;
  }

  // Separators that different sources spell a skill name with, e.g. "Next JS", "Next-JS",
  // "Next.js" and "NextJS" should all be treated as the same skill.
  private static final Pattern SEPARATORS = Pattern.compile("[\\s._/-]+");

  // Version/qualifier asides job postings tack onto a skill name, e.g. "Angular (12+)" -
  // these don't change what the skill IS, so they're dropped before comparison.
  private static final Pattern PARENTHETICAL = Pattern.compile("\\([^)]*\\)");

  // Generic descriptive words job postings pad a skill name with ("OOPS concepts", "UX
  // Knowledge") that carry no signal about the skill itself - stripped as whole words so
  // "OOPS concepts" compares as "oops", not the meaningless merged "oopsconcepts".
  private static final Pattern FILLER_WORDS =
      Pattern.compile("\\b(concepts?|knowledge|experience|skills?|proficiency)\\b");

  // Skill spellings that don't collapse to the same string by separator-stripping alone
  // (abbreviations, "*JS" framework names, etc). Keys and values are already
  // separator-stripped + lowercased; extend as new mismatches turn up.
  private static final Map<String, String> SKILL_ALIASES =
      Map.ofEntries(
          Map.entry("js", "javascript"),
          Map.entry("ts", "typescript"),
          Map.entry("reactjs", "react"),
          Map.entry("vuejs", "vue"),
          Map.entry("angularjs", "angular"),
          Map.entry("nodejs", "node"),
          Map.entry("nextjs", "next"),
          Map.entry("nuxtjs", "nuxt"),
          Map.entry("expressjs", "express"),
          Map.entry("golang", "go"),
          Map.entry("k8s", "kubernetes"),
          Map.entry("postgres", "postgresql"),
          Map.entry("mongo", "mongodb"),
          Map.entry("dotnet", "net"),
          Map.entry("aspnet", "net"),
          Map.entry("csharp", "c#"),
          Map.entry("cpp", "c++"),
          Map.entry("objectivec", "objective-c"),
          Map.entry("restapi", "rest"),
          Map.entry("restapis", "rest"),
          Map.entry("restfulapi", "rest"),
          Map.entry("restfulapis", "rest"),
          Map.entry("restfulservices", "rest"),
          Map.entry("restendpoints", "rest"),
          Map.entry("ci", "cicd"),
          Map.entry("cd", "cicd"),
          Map.entry("cicdpipelines", "cicd"),
          Map.entry("continuousintegration", "cicd"),
          Map.entry("continuousdeployment", "cicd"),
          Map.entry("continuousdelivery", "cicd"),
          Map.entry("tailwindcss", "tailwind"),
          Map.entry("oops", "oop"),
          // JVM / backend stack
          Map.entry("springboot", "spring"),
          Map.entry("springframework", "spring"),
          Map.entry("springdata", "spring"),
          Map.entry("springmvc", "spring"),
          Map.entry("j2ee", "java"),
          Map.entry("javaee", "java"),
          Map.entry("jakartaee", "java"),
          // Databases
          Map.entry("psql", "postgresql"),
          Map.entry("mssql", "sqlserver"),
          Map.entry("microsoftsqlserver", "sqlserver"),
          Map.entry("relationaldatabases", "sql"),
          Map.entry("rdbms", "sql"),
          // Containers / orchestration / infra
          Map.entry("dockerized", "docker"),
          Map.entry("dockerization", "docker"),
          Map.entry("containerorchestration", "kubernetes"),
          Map.entry("microservice", "microservices"),
          Map.entry("microservicesarchitecture", "microservices"),
          Map.entry("serviceorientedarchitecture", "microservices"),
          Map.entry("soa", "microservices"),
          // Messaging / streaming
          Map.entry("apachekafka", "kafka"),
          Map.entry("eventstreaming", "kafka"),
          Map.entry("messagequeues", "messagequeue"),
          Map.entry("messagebroker", "messagequeue"),
          // Caching
          Map.entry("caching", "cache"),
          // Cloud
          Map.entry("amazonwebservices", "aws"),
          Map.entry("googlecloudplatform", "gcp"),
          Map.entry("microsoftazure", "azure"),
          Map.entry("cloudcomputing", "cloud"));

  /**
   * Canonicalises a skill name for comparison: trims, lowercases, drops parenthetical
   * qualifiers ("Angular (12+)" -> "angular") and generic filler words ("OOPS concepts" ->
   * "oops"), strips common separators (spaces, dots, hyphens, slashes, underscores) so "Next
   * JS", "NextJS" and "next.js" all collapse to the same token, then applies a small alias
   * table for spellings that don't collapse via stripping alone (e.g. "JS" vs "JavaScript",
   * "Tailwind CSS" vs "Tailwind").
   */
  /** Public entry point for the same canonicalisation used inside {@link #score}, so other
   * services comparing skill names (e.g. the post-tailoring fabrication diff in
   * {@code JobListingService}) stay consistent with how a fit score itself decides two skill
   * names refer to the same thing. */
  public static String canonicalizeSkillName(String value) {
    return normalise(value);
  }

  private static String normalise(String value) {
    if (value == null) {
      return "";
    }
    String lowered = value.trim().toLowerCase(Locale.ROOT);
    String withoutAsides = FILLER_WORDS.matcher(PARENTHETICAL.matcher(lowered).replaceAll("")).replaceAll("");
    String stripped = SEPARATORS.matcher(withoutAsides).replaceAll("");
    return SKILL_ALIASES.getOrDefault(stripped, stripped);
  }

  private static double round(double value) {
    return Math.round(value * 10) / 10.0;
  }
}
