package com.lifeos.calendar.scheduler;

import com.lifeos.calendar.service.EventRecurrenceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Mirrors services/tasks' TaskRecurrenceScheduler - daily sweep generating any occurrences
 * missing out to the 30-day horizon for every active recurring event definition. */
@Component
@RequiredArgsConstructor
@Slf4j
public class EventRecurrenceScheduler {

  private final EventRecurrenceService eventRecurrenceService;

  @Scheduled(cron = "${calendar.recurrence.generate-cron:0 10 0 * * *}")
  public void generateOccurrences() {
    log.info("Generating recurring event occurrences");
    eventRecurrenceService.generateOccurrencesForAllDefinitions();
  }
}
