package com.lifeos.job_tracker.consumer;

import com.lifeos.common.events.JobEmailEventRecord;
import com.lifeos.job_tracker.service.EmailEventService;
import lombok.RequiredArgsConstructor;
import com.lifeos.common.events.AfterCommit;
import com.lifeos.common.events.SerialEventQueue;
import org.springframework.stereotype.Component;

/** Consumes what batches' Gmail job-search poller publishes to {@code job-email-events} (see
 * JobEmailSyncService in batches, which replaced a synchronous per-email REST call with this
 * topic so N emails no longer meant N sequential blocking classification calls in one cron tick).
 * {@code ingest} already dedupes on gmailMessageId, so a redelivered event is a safe no-op. */
@Component
@RequiredArgsConstructor
public class JobEmailEventConsumer {

  private final EmailEventService emailEventService;

  private final SerialEventQueue queue = new SerialEventQueue("job-email");

  @AfterCommit
  public void listen(JobEmailEventRecord event) {
    queue.submit(
        () ->
            emailEventService.ingest(
                event.userId(),
                event.gmailMessageId(),
                event.fromAddress(),
                event.subject(),
                event.body(),
                event.receivedAt()));
  }
}
