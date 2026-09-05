package com.lifeos.job_tracker.kafka;

import com.lifeos.job_tracker.service.FollowUpTaskService;
import com.lifeos.job_tracker.service.InterviewPrepService;
import com.lifeos.job_tracker.service.NotificationService;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/** Turns domain events into follow-up tasks, prep checklists and notifications. */
@Component
@RequiredArgsConstructor
public class JobEventConsumer {

  private static final Logger log = LoggerFactory.getLogger(JobEventConsumer.class);

  private final FollowUpTaskService followUpTaskService;
  private final InterviewPrepService interviewPrepService;
  private final NotificationService notificationService;

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
    log.debug("consumed {} {}", event.eventType(), event.eventId());
    UUID userId = event.userId();
    UUID applicationId = uuid(event, "applicationId");

    switch (event.eventType()) {
      case JobEventTopics.APPLICATION_SUBMITTED -> {
        if (userId != null && applicationId != null) {
          followUpTaskService.onApplicationSubmitted(userId, applicationId);
        }
      }
      case JobEventTopics.INTERVIEW_SCHEDULED -> {
        if (userId != null && applicationId != null) {
          followUpTaskService.onInterviewScheduled(userId, applicationId);
        }
        UUID roundId = uuid(event, "interviewRoundId");
        if (userId != null && roundId != null) {
          interviewPrepService.generateChecklist(userId, applicationId, roundId);
        }
      }
      case JobEventTopics.REFERRAL_INITIATED -> {
        if (userId != null && applicationId != null) {
          followUpTaskService.onReferralInitiated(userId, applicationId);
        }
      }
      case JobEventTopics.EMAIL_PARSED -> {
        if (userId != null && applicationId != null) {
          followUpTaskService.onRecruiterContacted(userId, applicationId);
        }
      }
      case JobEventTopics.JOB_DISCOVERED -> maybeNotifyHighMatch(event);
      default -> {
        // job.scoring / follow-up.due: no downstream action needed here yet
      }
    }
  }

  private void maybeNotifyHighMatch(JobEvent event) {
    Object score = event.payload().get("score");
    if (event.userId() != null && score instanceof Number number && number.intValue() >= 75) {
      notificationService.push(
          event.userId(),
          "HIGH_MATCH_JOB",
          "New high-match job: " + event.payload().getOrDefault("title", "role"),
          "Fit score " + number.intValue() + "% at " + event.payload().getOrDefault("company", ""),
          "JOB_LISTING",
          uuid(event, "jobId"));
    }
  }

  private static UUID uuid(JobEvent event, String key) {
    Object value = event.payload().get(key);
    if (value == null || "null".equals(value)) {
      return null;
    }
    try {
      return UUID.fromString(value.toString());
    } catch (IllegalArgumentException exception) {
      return null;
    }
  }
}
