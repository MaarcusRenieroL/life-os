package com.lifeos.job_tracker.kafka;

import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class JobEventProducer {

  private static final Logger log = LoggerFactory.getLogger(JobEventProducer.class);

  private final KafkaTemplate<String, JobEvent> jobEventKafkaTemplate;

  public void emit(String topic, UUID userId, Map<String, Object> payload) {
    JobEvent event = JobEvent.of(userId, topic, payload);
    jobEventKafkaTemplate
        .send(topic, userId == null ? null : userId.toString(), event)
        .whenComplete(
            (result, error) -> {
              if (error != null) {
                log.warn("Failed to publish {} event: {}", topic, error.getMessage());
              }
            });
  }
}
