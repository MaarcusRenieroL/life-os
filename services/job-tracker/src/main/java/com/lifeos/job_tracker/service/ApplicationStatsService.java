package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.entity.Interview;
import com.lifeos.job_tracker.domains.entity.JobListing;
import com.lifeos.job_tracker.repository.InterviewRepository;
import com.lifeos.job_tracker.repository.JobListingRepository;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Job-search activity in a date range, for core's weekly/monthly summaries: jobs saved, jobs
 * actually applied to (the appliedAt date), and interviews held in the range. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ApplicationStatsService {

  public record ApplicationStats(int saved, int applied, int interviews) {}

  private final JobListingRepository jobListingRepository;
  private final InterviewRepository interviewRepository;

  public ApplicationStats stats(UUID userId, LocalDate from, LocalDate to, ZoneId zone) {
    int saved = 0;
    int applied = 0;
    for (JobListing job : jobListingRepository.findAllForUser(userId)) {
      if (job.getCreatedAt() != null) {
        LocalDate created = job.getCreatedAt().atZone(zone).toLocalDate();
        if (!created.isBefore(from) && !created.isAfter(to)) saved++;
      }
      LocalDate appliedAt = job.getAppliedAt();
      if (appliedAt != null && !appliedAt.isBefore(from) && !appliedAt.isAfter(to)) applied++;
    }

    int interviews = 0;
    for (Interview interview :
        interviewRepository.findByUserIdAndScheduledAtBetween(userId, from.atStartOfDay(zone).toInstant(), to.plusDays(1).atStartOfDay(zone).toInstant())) {
      interviews++;
    }
    return new ApplicationStats(saved, applied, interviews);
  }
}
