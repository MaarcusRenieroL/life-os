package com.lifeos.core.automation;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Ticks the engine: scheduled rules are checked every minute (a rule is due if its latest
 * scheduled moment is after its last run, so a missed minute is caught up, not skipped), and
 * threshold rules every half hour. */
@Component
@RequiredArgsConstructor
public class AutomationScheduler {

  private final AutomationEngine engine;

  @Value("${analytics.zone:Asia/Kolkata}")
  private String zone;

  @Scheduled(cron = "${automation.schedule.cron:0 * * * * *}")
  public void tickScheduled() {
    engine.sweepScheduled(ZonedDateTime.now(ZoneId.of(zone)));
  }

  @Scheduled(cron = "${automation.threshold.cron:0 */30 * * * *}")
  public void tickThresholds() {
    engine.sweepThresholds();
  }
}
