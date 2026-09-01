package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.entity.JobListing;
import com.lifeos.job_tracker.domains.entity.Skill;
import com.lifeos.job_tracker.domains.enums.SeniorityLevel;
import com.lifeos.job_tracker.domains.enums.VisaSponsorship;
import com.lifeos.job_tracker.domains.enums.WorkModel;
import com.lifeos.job_tracker.repository.SkillRepository;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Deterministic, explainable job-fit scoring. The components and weights follow the spec's section
 * 4.1; each sub-score is 0..100 and the final score is their weighted average.
 */
@Service
@RequiredArgsConstructor
public class JobMatchingService {

  private final SkillRepository skillRepository;

  public record JobFitResult(int score, Map<String, Object> explanation) {}

  @Transactional(readOnly = true)
  public JobFitResult score(UUID userId, JobListing job) {
    List<Skill> skills = skillRepository.findAllByUserIdOrderByNameAsc(userId);
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

  private static String normalise(String value) {
    return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
  }

  private static double round(double value) {
    return Math.round(value * 10) / 10.0;
  }
}
