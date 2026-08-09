package com.lifeos.job_tracker.publisher;

import com.lifeos.job_tracker.domains.record.ApplicationStageChangedEvent;
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
  private final KafkaTemplate<String, ApplicationStageChangedEvent>
      applicationStageChangedKafkaTemplate;

  public void publishApplied(UUID applicationId, UUID jobId, UUID userId) {
    ApplicationAppliedEvent event =
        new ApplicationAppliedEvent(applicationId, jobId, userId, Instant.now());

    kafkaTemplate.send("applications.applied", userId.toString(), event);
  }

  public void publishStageChanged(
      UUID applicationId, UUID jobId, UUID userId, String previousStage, String newStage) {
    ApplicationStageChangedEvent event =
        new ApplicationStageChangedEvent(
            applicationId, jobId, userId, previousStage, newStage, Instant.now());

    applicationStageChangedKafkaTemplate.send(
        "applications.stage_changed", userId.toString(), event);
  }
}
