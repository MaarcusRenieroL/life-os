package com.lifeos.job_tracker.scheduler;

import com.lifeos.job_tracker.repository.WatchedCompanyRepository;
import com.lifeos.job_tracker.service.JobDiscoveryService;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Once a day, re-reads every active watched company's board for every user and raises at most one
 * "new openings" notification per user. A failure for one user never stops the others.
 */
@Component
@RequiredArgsConstructor
public class JobDiscoveryScanner {

  private static final Logger log = LoggerFactory.getLogger(JobDiscoveryScanner.class);

  private final WatchedCompanyRepository watchedCompanyRepository;
  private final JobDiscoveryService discoveryService;

  @Scheduled(cron = "${job-tracker.discovery.scan.cron:0 30 6 * * *}")
  public void scan() {
    for (UUID userId : watchedCompanyRepository.findUserIdsWithActiveWatches()) {
      try {
        var summary = discoveryService.scanUser(userId, true);
        log.info(
            "discovery scan for {}: {} companies, {} new, {} closed, {} errors",
            userId, summary.companiesScanned(), summary.newOpenings(), summary.closedOpenings(), summary.errors().size());
      } catch (RuntimeException exception) {
        log.warn("discovery scan failed for user {}: {}", userId, exception.getMessage());
      }
    }
  }
}
