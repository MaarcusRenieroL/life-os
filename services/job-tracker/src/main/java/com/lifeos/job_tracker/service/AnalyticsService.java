package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.entity.JobListing;
import com.lifeos.job_tracker.domains.entity.JobStatusHistory;
import com.lifeos.job_tracker.domains.entity.Referral;
import com.lifeos.job_tracker.domains.enums.JobStatus;
import com.lifeos.job_tracker.domains.enums.ReferralStatus;
import com.lifeos.job_tracker.domains.record.JobAnalyticsResponse;
import com.lifeos.job_tracker.domains.record.JobAnalyticsResponse.DailyCount;
import com.lifeos.job_tracker.domains.record.JobAnalyticsResponse.SkillFrequency;
import com.lifeos.job_tracker.domains.record.JobAnalyticsResponse.SourcePerformance;
import com.lifeos.job_tracker.domains.record.JobAnalyticsResponse.StageDwellTime;
import com.lifeos.job_tracker.domains.record.JobAnalyticsResponse.WeeklyCount;
import com.lifeos.job_tracker.repository.JobListingRepository;
import com.lifeos.job_tracker.repository.JobStatusHistoryRepository;
import com.lifeos.job_tracker.repository.ReferralRepository;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.WeekFields;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Aggregates the candidate's own pipeline into stats - everything computed in-memory over one
 * user's jobs/referrals/history, since at personal-tracker scale (dozens to low hundreds of rows)
 * that's simpler and just as fast as pushing the aggregation into SQL. */
@Service
@RequiredArgsConstructor
public class AnalyticsService {

  private static final Set<JobStatus> RESPONDED_STATUSES =
      Set.of(
          JobStatus.INTERVIEWING,
          JobStatus.WAITING_FOR_HR,
          JobStatus.OFFER_ACCEPTED,
          JobStatus.OFFER_REJECTED,
          JobStatus.REJECTED);
  private static final Set<JobStatus> INTERVIEWED_STATUSES =
      Set.of(JobStatus.INTERVIEWING, JobStatus.WAITING_FOR_HR, JobStatus.OFFER_ACCEPTED, JobStatus.OFFER_REJECTED);
  private static final Set<JobStatus> OFFERED_STATUSES =
      Set.of(JobStatus.OFFER_ACCEPTED, JobStatus.OFFER_REJECTED);
  private static final Set<ReferralStatus> REFERRAL_CONTACTED_STATUSES =
      Set.of(
          ReferralStatus.MESSAGE_DRAFTED,
          ReferralStatus.CONTACTED,
          ReferralStatus.RESPONDED,
          ReferralStatus.REFERRED,
          ReferralStatus.DECLINED);
  private static final Set<ReferralStatus> REFERRAL_RESPONDED_STATUSES =
      Set.of(ReferralStatus.RESPONDED, ReferralStatus.REFERRED, ReferralStatus.DECLINED);

  private final JobListingRepository jobListingRepository;
  private final ReferralRepository referralRepository;
  private final JobStatusHistoryRepository jobStatusHistoryRepository;

  @Transactional(readOnly = true)
  public JobAnalyticsResponse compute(UUID userId) {
    List<JobListing> jobs = jobListingRepository.findAllForUser(userId);
    List<JobListing> applied = jobs.stream().filter(j -> j.getAppliedAt() != null).toList();

    return new JobAnalyticsResponse(
        applied.size(),
        applicationsByDay(applied),
        applicationsByWeek(applied),
        ratePct(applied, RESPONDED_STATUSES),
        ratePct(applied, Set.of(JobStatus.REJECTED)),
        ratePct(applied, INTERVIEWED_STATUSES),
        ratePct(applied, OFFERED_STATUSES),
        referralResponseRatePct(referralRepository.findByUserId(userId)),
        bestPerformingSources(applied),
        mostCommonMissingSkills(jobs),
        averageTimeInStage(jobStatusHistoryRepository.findByUserIdOrderByJobIdAscChangedAtAsc(userId)));
  }

  private static List<DailyCount> applicationsByDay(List<JobListing> applied) {
    LocalDate since = LocalDate.now(ZoneOffset.UTC).minusDays(29);
    Map<LocalDate, Integer> counts = new LinkedHashMap<>();
    for (LocalDate d = since; !d.isAfter(LocalDate.now(ZoneOffset.UTC)); d = d.plusDays(1)) {
      counts.put(d, 0);
    }
    for (JobListing job : applied) {
      LocalDate day = job.getAppliedAt();
      if (day != null && !day.isBefore(since)) {
        counts.merge(day, 1, Integer::sum);
      }
    }
    return counts.entrySet().stream().map(e -> new DailyCount(e.getKey(), e.getValue())).toList();
  }

  private static List<WeeklyCount> applicationsByWeek(List<JobListing> applied) {
    WeekFields weekFields = WeekFields.of(Locale.getDefault());
    LocalDate thisWeekStart = LocalDate.now(ZoneOffset.UTC).with(weekFields.dayOfWeek(), 1);
    LocalDate since = thisWeekStart.minusWeeks(11);
    Map<LocalDate, Integer> counts = new LinkedHashMap<>();
    for (LocalDate w = since; !w.isAfter(thisWeekStart); w = w.plusWeeks(1)) {
      counts.put(w, 0);
    }
    for (JobListing job : applied) {
      LocalDate day = job.getAppliedAt();
      if (day == null) continue;
      LocalDate weekStart = day.with(weekFields.dayOfWeek(), 1);
      if (!weekStart.isBefore(since)) {
        counts.merge(weekStart, 1, Integer::sum);
      }
    }
    return counts.entrySet().stream().map(e -> new WeeklyCount(e.getKey(), e.getValue())).toList();
  }

  private static double ratePct(List<JobListing> applied, Set<JobStatus> matching) {
    if (applied.isEmpty()) return 0;
    long count = applied.stream().filter(j -> matching.contains(j.getStatus())).count();
    return round1(count * 100.0 / applied.size());
  }

  private static double referralResponseRatePct(List<Referral> referrals) {
    long contacted = referrals.stream().filter(r -> REFERRAL_CONTACTED_STATUSES.contains(r.getStatus())).count();
    if (contacted == 0) return 0;
    long responded = referrals.stream().filter(r -> REFERRAL_RESPONDED_STATUSES.contains(r.getStatus())).count();
    return round1(responded * 100.0 / contacted);
  }

  private static List<SourcePerformance> bestPerformingSources(List<JobListing> applied) {
    Map<String, List<JobListing>> bySource =
        applied.stream()
            .collect(
                java.util.stream.Collectors.groupingBy(
                    j -> j.getSource() == null || j.getSource().isBlank() ? "unknown" : j.getSource()));
    List<SourcePerformance> result = new ArrayList<>();
    bySource.forEach(
        (source, list) ->
            result.add(new SourcePerformance(source, list.size(), ratePct(list, RESPONDED_STATUSES))));
    result.sort(
        Comparator.comparingDouble(SourcePerformance::responseRatePct)
            .thenComparingInt(SourcePerformance::applications)
            .reversed());
    return result;
  }

  @SuppressWarnings("unchecked")
  private static List<SkillFrequency> mostCommonMissingSkills(List<JobListing> jobs) {
    Map<String, Integer> counts = new LinkedHashMap<>();
    for (JobListing job : jobs) {
      Map<String, Object> explanation = job.getFitExplanation();
      if (explanation == null) continue;
      Object missing = explanation.get("missingSkills");
      if (!(missing instanceof List<?> list)) continue;
      for (Object skill : list) {
        if (skill instanceof String s && !s.isBlank()) {
          counts.merge(s, 1, Integer::sum);
        }
      }
    }
    return counts.entrySet().stream()
        .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
        .limit(10)
        .map(e -> new SkillFrequency(e.getKey(), e.getValue()))
        .toList();
  }

  /** For each job's status history (sorted oldest-first), pairs consecutive transitions to
   * measure how long the job sat in the stage it moved into before moving again - then averages
   * that dwell time across all jobs, per stage. A job's most recent stage (no next transition
   * yet) is excluded since its dwell time isn't over. */
  private static List<StageDwellTime> averageTimeInStage(List<JobStatusHistory> history) {
    Map<UUID, List<JobStatusHistory>> byJob =
        history.stream()
            .collect(java.util.stream.Collectors.groupingBy(JobStatusHistory::getJobId, LinkedHashMap::new, java.util.stream.Collectors.toList()));

    Map<String, List<Long>> hoursByStage = new LinkedHashMap<>();
    for (List<JobStatusHistory> entries : byJob.values()) {
      for (int i = 0; i < entries.size() - 1; i++) {
        JobStatusHistory current = entries.get(i);
        JobStatusHistory next = entries.get(i + 1);
        if (current.getToStatus() == null) continue;
        long hours = Duration.between(current.getChangedAt(), next.getChangedAt()).toHours();
        hoursByStage.computeIfAbsent(current.getToStatus().name(), k -> new ArrayList<>()).add(hours);
      }
    }

    return hoursByStage.entrySet().stream()
        .map(
            e -> {
              double avgHours = e.getValue().stream().mapToLong(Long::longValue).average().orElse(0);
              return new StageDwellTime(e.getKey(), round1(avgHours / 24.0), e.getValue().size());
            })
        .sorted(Comparator.comparing(StageDwellTime::stage))
        .toList();
  }

  private static double round1(double value) {
    return Math.round(value * 10.0) / 10.0;
  }
}
