package com.lifeos.core.consumer;

import com.lifeos.common.events.EmailHubEventRecord;
import com.lifeos.core.service.EmailHubService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/** Consumes what batches' inbox poller publishes to {@code email-hub-events}. */
@Component
@RequiredArgsConstructor
public class EmailHubEventConsumer {

  private static final Logger log = LoggerFactory.getLogger(EmailHubEventConsumer.class);

  private final EmailHubService emailHubService;

  @KafkaListener(
      topics = "email-hub-events",
      groupId = "core-email-hub",
      containerFactory = "emailHubEventListenerContainerFactory")
  public void listen(EmailHubEventRecord event) {
    try {
      emailHubService.ingest(event);
    } catch (RuntimeException failure) {
      // One bad email must not stall the queue behind it (Kafka would redeliver it forever).
      log.error("Email hub failed on {}: {}", event.gmailMessageId(), failure.getMessage(), failure);
    }
  }
}
