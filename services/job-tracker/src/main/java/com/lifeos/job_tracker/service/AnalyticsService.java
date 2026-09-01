package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.entity.Application;
import com.lifeos.job_tracker.domains.entity.ApplicationStatusHistory;
import com.lifeos.job_tracker.domains.entity.InterviewRound;
import com.lifeos.job_tracker.domains.entity.JobListing;
import com.lifeos.job_tracker.domains.entity.Offer;
import com.lifeos.job_tracker.domains.entity.OutreachAttempt;
import com.lifeos.job_tracker.domains.enums.ApplicationStatus;
import com.lifeos.job_tracker.domains.enums.OutreachChannel;
import com.lifeos.job_tracker.repository.ApplicationRepository;
import com.lifeos.job_tracker.repository.ApplicationStatusHistoryRepository;
import com.lifeos.job_tracker.repository.InterviewRoundRepository;
import com.lifeos.job_tracker.repository.JobListingRepository;
import com.lifeos.job_tracker.repository.OfferRepository;
import com.lifeos.job_tracker.repository.OutreachAttemptRepository;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * In-memory analytics over the user's applications. Volumes are small (~20/day) so this loads the
 * working set and aggregates in Java rather than pushing every metric into SQL.
 */
@Service
@RequiredArgsConstructor
public class AnalyticsService {

  private final ApplicationRepository applicationRepository;
  private final ApplicationStatusHistoryRepository historyRepository;
  private final InterviewRoundRepository interviewRoundRepository;
  private final OfferRepository offerRepository;
  private final JobListingRepository jobListingRepository;
  private final OutreachAttemptRepository outreachRepository;

  @Transactional(readOnly = true)
  public Map<String, Object> snapshot(UUID userId) {
    List<Application> applications = applicationRepository.findAllByUserIdOrderByCreatedAtDesc(userId);
    List<UUID> appIds = applications.stream().map(Application::getId).toList();

    Map<UUID, List<ApplicationStatusHistory>> historyByApp =
        appIds.isEmpty()
            ? Map.of()
            : historyRepository.findAllByApplicationIdInOrderByChangedAtAsc(appIds).stream()
                .collect(Collectors.groupingBy(ApplicationStatusHistory::getApplicationId));
    Map<UUID, List<InterviewRound>> roundsByApp =
        appIds.isEmpty()
            ? Map.of()
            : interviewRoundRepository.findAllByApplicationIdIn(appIds).stream()
                .collect(Collectors.groupingBy(InterviewRound::getApplicationId));
    List<Offer> offers = appIds.isEmpty() ? List.of() : offerRepository.findAllByApplicationIdIn(appIds);
    Map<UUID, JobListing> jobs =
        jobListingRepository
            .findAllById(applications.stream().map(Application::getJobListingId).toList())
            .stream()
            .collect(Collectors.toMap(JobListing::getId, job -> job));
    List<OutreachAttempt> outreach = outreachRepository.findAllByUserIdOrderByCreatedAtDesc(userId);

    Map<String, Object> result = new LinkedHashMap<>();
    result.put("pipeline", pipelineCounts(applications));
    result.put("conversion", conversion(applications, roundsByApp, offers));
    result.put("timeMetrics", timeMetrics(applications, historyByApp));
    result.put("sourcePerformance", sourcePerformance(applications, jobs, roundsByApp, offers));
    result.put("skillGaps", skillGaps(applications, jobs));
    result.put("seniorityDistribution", seniorityDistribution(applications, jobs));
    result.put("outreachPerformance", outreachPerformance(outreach));
    result.put("weeklyVolume", weeklyVolume(applications));
    return result;
  }

  private Map<String, Long> pipelineCounts(List<Application> applications) {
    Map<String, Long> counts = new LinkedHashMap<>();
    for (ApplicationStatus status : ApplicationStatus.values()) {
      counts.put(status.value(), 0L);
    }
    for (Application application : applications) {
      counts.merge(application.getStatus().value(), 1L, Long::sum);
    }
    return counts;
  }

  private Map<String, Object> conversion(
      List<Application> applications,
      Map<UUID, List<InterviewRound>> roundsByApp,
      List<Offer> offers) {
    long total = applications.size();
    long reachedInterview =
        applications.stream()
            .filter(a -> !roundsByApp.getOrDefault(a.getId(), List.of()).isEmpty() || isPastInterview(a.getStatus()))
            .count();
    long reachedOffer =
        applications.stream()
            .filter(a -> a.getStatus() == ApplicationStatus.OFFER)
            .count()
            + offers.size();
    Map<String, Object> map = new LinkedHashMap<>();
    map.put("totalApplications", total);
    map.put("reachedInterview", reachedInterview);
    map.put("reachedOffer", Math.min(reachedOffer, total));
    map.put("applicationToInterviewRate", pct(reachedInterview, total));
    map.put("interviewToOfferRate", pct(Math.min(reachedOffer, total), reachedInterview));
    map.put("overallOfferRate", pct(Math.min(reachedOffer, total), total));
    return map;
  }

  private Map<String, Object> timeMetrics(
      List<Application> applications, Map<UUID, List<ApplicationStatusHistory>> historyByApp) {
    List<Long> toFirstResponse = new ArrayList<>();
    List<Long> toInterview = new ArrayList<>();
    List<Long> toOffer = new ArrayList<>();
    long longestStalledDays = 0;

    for (Application application : applications) {
      Instant applied = application.getApplicationDate() == null ? application.getCreatedAt() : application.getApplicationDate();
      List<ApplicationStatusHistory> history = historyByApp.getOrDefault(application.getId(), List.of());
      for (ApplicationStatusHistory entry : history) {
        if ("Applied".equals(entry.getOldStatus()) || "Applied".equals(entry.getNewStatus())) {
          continue;
        }
      }
      history.stream()
          .filter(h -> !"Applied".equals(h.getNewStatus()) && h.getOldStatus() != null)
          .findFirst()
          .ifPresent(h -> toFirstResponse.add(days(applied, h.getChangedAt())));
      history.stream()
          .filter(h -> isInterviewStatus(h.getNewStatus()))
          .findFirst()
          .ifPresent(h -> toInterview.add(days(applied, h.getChangedAt())));
      history.stream()
          .filter(h -> "Offer".equals(h.getNewStatus()))
          .findFirst()
          .ifPresent(h -> toOffer.add(days(applied, h.getChangedAt())));

      if (!application.getStatus().isTerminal() && application.getStatus() != ApplicationStatus.OFFER) {
        longestStalledDays = Math.max(longestStalledDays, days(application.getUpdatedAt(), Instant.now()));
      }
    }

    Map<String, Object> map = new LinkedHashMap<>();
    map.put("avgDaysToFirstResponse", avg(toFirstResponse));
    map.put("avgDaysToInterview", avg(toInterview));
    map.put("avgDaysToOffer", avg(toOffer));
    map.put("longestStalledDays", longestStalledDays);
    return map;
  }

  private List<Map<String, Object>> sourcePerformance(
      List<Application> applications,
      Map<UUID, JobListing> jobs,
      Map<UUID, List<InterviewRound>> roundsByApp,
      List<Offer> offers) {
    Map<String, int[]> bySource = new LinkedHashMap<>(); // [apps, interviews, offers]
    for (Application application : applications) {
      JobListing job = jobs.get(application.getJobListingId());
      String source = job == null || job.getSource() == null ? "unknown" : job.getSource();
      int[] row = bySource.computeIfAbsent(source, key -> new int[3]);
      row[0]++;
      if (!roundsByApp.getOrDefault(application.getId(), List.of()).isEmpty() || isPastInterview(application.getStatus())) {
        row[1]++;
      }
      if (application.getStatus() == ApplicationStatus.OFFER) {
        row[2]++;
      }
    }
    List<Map<String, Object>> rows = new ArrayList<>();
    bySource.forEach(
        (source, row) -> {
          Map<String, Object> entry = new LinkedHashMap<>();
          entry.put("source", source);
          entry.put("applications", row[0]);
          entry.put("interviews", row[1]);
          entry.put("offers", row[2]);
          entry.put("offerRate", pct(row[2], row[0]));
          rows.add(entry);
        });
    rows.sort(Comparator.comparingDouble(r -> -((Number) r.get("offerRate")).doubleValue()));
    return rows;
  }

  private List<Map<String, Object>> skillGaps(List<Application> applications, Map<UUID, JobListing> jobs) {
    Map<String, Integer> missing = new LinkedHashMap<>();
    long rejections =
        applications.stream().filter(a -> a.getStatus() == ApplicationStatus.REJECTED).count();
    for (Application application : applications) {
      if (application.getStatus() != ApplicationStatus.REJECTED) {
        continue;
      }
      JobListing job = jobs.get(application.getJobListingId());
      if (job == null || job.getFitExplanation() == null) {
        continue;
      }
      Object raw = job.getFitExplanation().get("missingSkills");
      if (raw instanceof List<?> list) {
        for (Object skill : list) {
          missing.merge(String.valueOf(skill), 1, Integer::sum);
        }
      }
    }
    return missing.entrySet().stream()
        .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
        .limit(10)
        .map(
            e -> {
              Map<String, Object> row = new LinkedHashMap<>();
              row.put("skill", e.getKey());
              row.put("rejectionsMissingIt", e.getValue());
              row.put("shareOfRejections", pct(e.getValue(), rejections));
              return row;
            })
        .toList();
  }

  private Map<String, Long> seniorityDistribution(
      List<Application> applications, Map<UUID, JobListing> jobs) {
    Map<String, Long> distribution = new LinkedHashMap<>();
    for (Application application : applications) {
      JobListing job = jobs.get(application.getJobListingId());
      String level = job == null || job.getSeniorityLevel() == null ? "UNKNOWN" : job.getSeniorityLevel().name();
      distribution.merge(level, 1L, Long::sum);
    }
    return distribution;
  }

  private Map<String, Object> outreachPerformance(List<OutreachAttempt> outreach) {
    Map<String, Object> map = new LinkedHashMap<>();
    map.put("emailOpenRate", channelRate(outreach, OutreachChannel.COLD_EMAIL, OutreachAttempt::isOpened));
    map.put("emailReplyRate", channelRate(outreach, OutreachChannel.COLD_EMAIL, OutreachAttempt::isReplied));
    map.put("linkedinResponseRate", channelRate(outreach, OutreachChannel.LINKEDIN, OutreachAttempt::isReplied));
    map.put("referralResponseRate", channelRate(outreach, OutreachChannel.REFERRAL, OutreachAttempt::isReplied));
    long applications =
        outreach.stream().map(OutreachAttempt::getApplicationId).distinct().count();
    long withAnyReply =
        outreach.stream()
            .filter(OutreachAttempt::isReplied)
            .map(OutreachAttempt::getApplicationId)
            .distinct()
            .count();
    map.put("multiChannelResponseRate", pct(withAnyReply, applications));
    return map;
  }

  private Map<String, Long> weeklyVolume(List<Application> applications) {
    Map<String, Long> weeks = new LinkedHashMap<>();
    Instant now = Instant.now();
    for (int week = 7; week >= 0; week--) {
      weeks.put("week-" + week, 0L);
    }
    for (Application application : applications) {
      Instant when = application.getApplicationDate() == null ? application.getCreatedAt() : application.getApplicationDate();
      long weeksAgo = ChronoUnit.WEEKS.between(when, now);
      if (weeksAgo >= 0 && weeksAgo <= 7) {
        weeks.merge("week-" + weeksAgo, 1L, Long::sum);
      }
    }
    return weeks;
  }

  private static double channelRate(
      List<OutreachAttempt> outreach, OutreachChannel channel, java.util.function.Predicate<OutreachAttempt> hit) {
    long total = outreach.stream().filter(a -> a.getChannel() == channel).count();
    long hits = outreach.stream().filter(a -> a.getChannel() == channel).filter(hit).count();
    return pct(hits, total);
  }

  private static boolean isInterviewStatus(String status) {
    return "Screening".equals(status)
        || "Technical Interview".equals(status)
        || "System Design Interview".equals(status)
        || "Final Interview".equals(status);
  }

  private static boolean isPastInterview(ApplicationStatus status) {
    return switch (status) {
      case SCREENING, TECHNICAL_INTERVIEW, SYSTEM_DESIGN_INTERVIEW, FINAL_INTERVIEW, OFFER -> true;
      default -> false;
    };
  }

  private static long days(Instant from, Instant to) {
    return Math.max(0, Duration.between(from, to).toDays());
  }

  private static double avg(List<Long> values) {
    return values.isEmpty()
        ? 0
        : Math.round(values.stream().mapToLong(Long::longValue).average().orElse(0) * 10) / 10.0;
  }

  private static double pct(long numerator, long denominator) {
    return denominator == 0 ? 0 : Math.round(1000.0 * numerator / denominator) / 10.0;
  }
}
