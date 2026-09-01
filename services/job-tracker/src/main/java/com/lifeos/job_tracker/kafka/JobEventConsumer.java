package com.lifeos.job_tracker.kafka;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * Phase 1 automation stubs. Each listener currently just records the event; Phase 3+ fills these in
 * (follow-up task generation, prep checklist creation, re-scoring, Gmail threading).
 */
@Component
@RequiredArgsConstructor
public class JobEventConsumer {

  private static final Logger log = LoggerFactory.getLogger(JobEventConsumer.class);

  @KafkaListener(
      topics = {
        JobEventTopics.JOB_DISCOVERED,
        JobEventTopics.APPLICATION_SUBMITTED,
        JobEventTopics.INTERVIEW_SCHEDULED,
        JobEventTopics.EMAIL_PARSED,
        JobEventTopics.REFERRAL_INITIATED,
        JobEventTopics.JOB_SCORING,
        JobEventTopics.FOLLOW_UP_DUE
      },
      groupId = "job-tracker",
      containerFactory = "jobEventKafkaListenerContainerFactory")
  public void onEvent(JobEvent event) {
    log.info(
        "consumed {} event {} for user {} payload={}",
        event.eventType(),
        event.eventId(),
        event.userId(),
        event.payload());
  }
}
