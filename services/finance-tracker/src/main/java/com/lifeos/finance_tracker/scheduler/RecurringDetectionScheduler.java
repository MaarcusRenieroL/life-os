package com.lifeos.finance_tracker.scheduler;

import com.lifeos.finance_tracker.service.RecurringDetectionService;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class RecurringDetectionScheduler {

  @Value("${owner.user-id}")
  private String ownerUserId;

  private final RecurringDetectionService recurringDetectionService;

  @Scheduled(cron = "${recurring.detection.cron:0 0 2 * * *}")
  public void scheduleDetectPatterns() {
    recurringDetectionService.detectPatterns(UUID.fromString(ownerUserId));
  }
}
