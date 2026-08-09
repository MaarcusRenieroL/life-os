package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.dto.response.AnalyticsDashboardResponse;
import com.lifeos.job_tracker.domains.entity.Application;
import com.lifeos.job_tracker.domains.entity.Job;
import com.lifeos.job_tracker.domains.enums.ApplicationStage;
import com.lifeos.job_tracker.domains.enums.JobSource;
import com.lifeos.job_tracker.domains.record.ConversionFunnelResponse;
import com.lifeos.job_tracker.domains.record.RateResponse;
import com.lifeos.job_tracker.domains.record.ReferralEffectivenessResponse;
import com.lifeos.job_tracker.domains.record.SkillCount;
import com.lifeos.job_tracker.domains.record.TimeToOfferResponse;
import com.lifeos.job_tracker.repository.ApplicationRepository;
import com.lifeos.job_tracker.repository.JobRepository;
import java.time.Duration;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// All metrics here are computed in-memory from the full application/job list
// for the current user rather than SQL aggregate queries - fine at personal
// scale (dozens to low hundreds of rows), and much simpler than hand-rolling
// JPQL for every metric.
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AnalyticsService {

  private static final List<ApplicationStage> TERMINAL_UNKNOWN_PROGRESS =
      List.of(ApplicationStage.REJECTED, ApplicationStage.WITHDRAWN);

  private final ApplicationRepository applicationRepository;
  private final JobRepository jobRepository;

  public AnalyticsDashboardResponse getDashboard(Authentication authentication) {
    UUID userId = (UUID) authentication.getPrincipal();
    List<Application> applications = applicationRepository.findAllByUserId(userId);
    List<Job> jobs = jobRepository.findAllByUserIdOrderByCreatedAtDesc(userId);

    long total = applications.size();
    long active = applications.stream().filter(a -> a.getStatus() == null || "ACTIVE".equals(a.getStatus().name())).count();
    long interviewing = countByStage(applications, ApplicationStage.INTERVIEWING);
    long offers = countByStage(applications, ApplicationStage.OFFER);
    long responded = applications.stream().filter(a -> a.getCurrentStage() != ApplicationStage.APPLIED).count();

    return AnalyticsDashboardResponse.builder()
        .totalJobs(jobs.size())
        .totalApplications(total)
        .activeApplications(active)
        .interviewingCount(interviewing)
        .offerCount(offers)
        .responseRate(total == 0 ? 0 : (double) responded / total)
        .offerRate(total == 0 ? 0 : (double) offers / total)
        .build();
  }

  public Map<ApplicationStage, Long> getPipeline(Authentication authentication) {
    List<Application> applications = getApplications(authentication);

    return applications.stream()
        .filter(a -> a.getCurrentStage() != null)
        .collect(Collectors.groupingBy(Application::getCurrentStage, Collectors.counting()));
  }

  public RateResponse getResponseRate(Authentication authentication) {
    List<Application> applications = getApplications(authentication);
    long total = applications.size();
    long responded = applications.stream().filter(a -> a.getCurrentStage() != ApplicationStage.APPLIED).count();

    return new RateResponse(total == 0 ? 0 : (double) responded / total, responded, total);
  }

  public RateResponse getOfferRate(Authentication authentication) {
    List<Application> applications = getApplications(authentication);
    long total = applications.size();
    long offers = countByStage(applications, ApplicationStage.OFFER);

    return new RateResponse(total == 0 ? 0 : (double) offers / total, offers, total);
  }

  public Map<JobSource, Long> getSourcePerformance(Authentication authentication) {
    UUID userId = (UUID) authentication.getPrincipal();
    List<Job> jobs = jobRepository.findAllByUserIdOrderByCreatedAtDesc(userId);

    return jobs.stream()
        .filter(j -> j.getSource() != null)
        .collect(Collectors.groupingBy(Job::getSource, Collectors.counting()));
  }

  public List<SkillCount> getSkillsGap(Authentication authentication) {
    UUID userId = (UUID) authentication.getPrincipal();
    List<Job> jobs = jobRepository.findAllByUserIdOrderByCreatedAtDesc(userId);

    Map<String, Long> counts =
        jobs.stream()
            .filter(j -> j.getRequiredSkills() != null)
            .flatMap(j -> j.getRequiredSkills().stream())
            .collect(Collectors.groupingBy(skill -> skill, Collectors.counting()));

    return counts.entrySet().stream()
        .map(e -> new SkillCount(e.getKey(), e.getValue()))
        .sorted(Comparator.comparingLong(SkillCount::count).reversed())
        .limit(10)
        .toList();
  }

  public ConversionFunnelResponse getConversionFunnel(Authentication authentication) {
    List<Application> applications = getApplications(authentication);
    List<Application> progressing =
        applications.stream().filter(a -> !TERMINAL_UNKNOWN_PROGRESS.contains(a.getCurrentStage())).toList();

    long applied = progressing.size();
    long recruiterScreening =
        progressing.stream()
            .filter(
                a ->
                    a.getCurrentStage() == ApplicationStage.RECRUITER_SCREENING
                        || a.getCurrentStage() == ApplicationStage.INTERVIEWING
                        || a.getCurrentStage() == ApplicationStage.OFFER)
            .count();
    long interviewing =
        progressing.stream()
            .filter(a -> a.getCurrentStage() == ApplicationStage.INTERVIEWING || a.getCurrentStage() == ApplicationStage.OFFER)
            .count();
    long offer = progressing.stream().filter(a -> a.getCurrentStage() == ApplicationStage.OFFER).count();

    return new ConversionFunnelResponse(applied, recruiterScreening, interviewing, offer);
  }

  public ReferralEffectivenessResponse getReferralEffectiveness(Authentication authentication) {
    List<Application> applications = getApplications(authentication);

    List<Application> referred =
        applications.stream().filter(a -> Boolean.TRUE.equals(a.getReferralReceived())).toList();
    List<Application> nonReferred =
        applications.stream().filter(a -> !Boolean.TRUE.equals(a.getReferralReceived())).toList();

    double referredOfferRate =
        referred.isEmpty() ? 0 : (double) countByStage(referred, ApplicationStage.OFFER) / referred.size();
    double nonReferredOfferRate =
        nonReferred.isEmpty()
            ? 0
            : (double) countByStage(nonReferred, ApplicationStage.OFFER) / nonReferred.size();

    return new ReferralEffectivenessResponse(
        referredOfferRate, referred.size(), nonReferredOfferRate, nonReferred.size());
  }

  public TimeToOfferResponse getTimeToOffer(Authentication authentication) {
    List<Application> applications = getApplications(authentication);

    List<Integer> days =
        applications.stream()
            .filter(a -> a.getCurrentStage() == ApplicationStage.OFFER)
            .filter(a -> a.getApplicationDate() != null && a.getUpdatedAt() != null)
            .map(a -> (int) Duration.between(a.getApplicationDate(), a.getUpdatedAt()).toDays())
            .toList();

    double average = days.stream().mapToInt(Integer::intValue).average().orElse(0);

    return new TimeToOfferResponse(average, days);
  }

  private List<Application> getApplications(Authentication authentication) {
    UUID userId = (UUID) authentication.getPrincipal();
    return applicationRepository.findAllByUserId(userId);
  }

  private long countByStage(List<Application> applications, ApplicationStage stage) {
    return applications.stream().filter(a -> a.getCurrentStage() == stage).count();
  }
}
