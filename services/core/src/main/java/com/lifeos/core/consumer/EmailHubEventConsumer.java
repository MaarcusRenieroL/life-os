package com.lifeos.core.consumer;

import com.lifeos.common.events.EmailHubEventRecord;
import com.lifeos.core.service.EmailHubService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.lifeos.common.events.AfterCommit;
import com.lifeos.common.events.SerialEventQueue;
import org.springframework.stereotype.Component;

/** Consumes what batches' inbox poller publishes to {@code email-hub-events}. */
@Component
@RequiredArgsConstructor
public class EmailHubEventConsumer {

  private static final Logger log = LoggerFactory.getLogger(EmailHubEventConsumer.class);

  private final EmailHubService emailHubService;

  // Each email is a slow model call, so they are taken strictly one at a time.
  private final SerialEventQueue queue = new SerialEventQueue("email-hub");

  @AfterCommit
  public void listen(EmailHubEventRecord event) {
    queue.submit(() -> ingest(event));
  }

  private void ingest(EmailHubEventRecord event) {
    try {
      emailHubService.ingest(event);
    } catch (RuntimeException failure) {
      // One bad email must not stall the queue behind it (it would otherwise be retried forever).
      log.error("Email hub failed on {}: {}", event.gmailMessageId(), failure.getMessage(), failure);
    }
  }
}
