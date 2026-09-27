package com.lifeos.job_tracker.consumer;

import com.lifeos.common.events.JobEmailEventRecord;
import com.lifeos.job_tracker.service.EmailEventService;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/** Consumes what batches' Gmail job-search poller publishes to {@code job-email-events} (see
 * JobEmailSyncService in batches, which replaced a synchronous per-email REST call with this
 * topic so N emails no longer meant N sequential blocking classification calls in one cron tick).
 * {@code ingest} already dedupes on gmailMessageId, so a redelivered event is a safe no-op. */
@Component
@RequiredArgsConstructor
public class JobEmailEventConsumer {

  private final EmailEventService emailEventService;

  @KafkaListener(
      topics = "job-email-events",
      groupId = "job-tracker-service",
      containerFactory = "jobEmailEventListenerContainerFactory")
  public void listen(JobEmailEventRecord event) {
    emailEventService.ingest(
        event.userId(), event.gmailMessageId(), event.fromAddress(), event.subject(), event.body());
  }
}
