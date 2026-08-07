package com.lifeos.job_tracker.publisher;

import com.lifeos.job_tracker.events.ApplicationAppliedEvent;
import java.time.Instant;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ApplicationEventPublisher {

  private final KafkaTemplate<String, ApplicationAppliedEvent> kafkaTemplate;

  public void publishApplied(UUID applicationId, UUID jobId, UUID userId) {
    ApplicationAppliedEvent event =
        new ApplicationAppliedEvent(applicationId, jobId, userId, Instant.now());

    kafkaTemplate.send("applications.applied", userId.toString(), event);
  }
}
