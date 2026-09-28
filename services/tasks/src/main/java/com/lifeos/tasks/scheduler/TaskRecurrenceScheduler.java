package com.lifeos.tasks.scheduler;

import com.lifeos.tasks.service.TaskRecurrenceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Daily sweep: for every active (not paused) recurring task definition, generate any occurrences
 * missing between now and the 30-day horizon - see TaskRecurrenceService for why a rolling
 * horizon instead of materializing every future occurrence up front. */
@Component
@RequiredArgsConstructor
@Slf4j
public class TaskRecurrenceScheduler {

  private final TaskRecurrenceService taskRecurrenceService;

  @Scheduled(cron = "${tasks.recurrence.generate-cron:0 5 0 * * *}")
  public void generateOccurrences() {
    log.info("Generating recurring task occurrences");
    taskRecurrenceService.generateOccurrencesForAllDefinitions();
  }
}
