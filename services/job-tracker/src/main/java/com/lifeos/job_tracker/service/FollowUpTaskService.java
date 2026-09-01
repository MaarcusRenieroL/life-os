package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.config.JobTrackerProperties;
import com.lifeos.job_tracker.domains.dto.request.CreateFollowUpTaskRequest;
import com.lifeos.job_tracker.domains.entity.Application;
import com.lifeos.job_tracker.domains.entity.FollowUpTask;
import com.lifeos.job_tracker.domains.entity.JobListing;
import com.lifeos.job_tracker.domains.enums.FollowUpTaskStatus;
import com.lifeos.job_tracker.domains.enums.FollowUpTaskType;
import com.lifeos.job_tracker.domains.enums.TaskPriority;
import com.lifeos.job_tracker.exception.ResourceNotFoundException;
import com.lifeos.job_tracker.kafka.JobEventProducer;
import com.lifeos.job_tracker.kafka.JobEventTopics;
import com.lifeos.job_tracker.repository.ApplicationRepository;
import com.lifeos.job_tracker.repository.FollowUpTaskRepository;
import com.lifeos.job_tracker.repository.JobListingRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Auto-generates follow-up reminders off domain events and sweeps due ones into notifications +
 * {@code follow-up.due} events.
 */
@Service
@RequiredArgsConstructor
public class FollowUpTaskService {

  private static final Logger log = LoggerFactory.getLogger(FollowUpTaskService.class);

  private final FollowUpTaskRepository taskRepository;
  private final ApplicationRepository applicationRepository;
  private final JobListingRepository jobListingRepository;
  private final NotificationService notificationService;
  private final JobEventProducer eventProducer;
  private final JobTrackerProperties properties;

  @Transactional(readOnly = true)
  public List<FollowUpTask> list(UUID userId, FollowUpTaskStatus status) {
    return status == null
        ? taskRepository.findAllByUserIdOrderByDueDateAsc(userId)
        : taskRepository.findAllByUserIdAndStatusOrderByDueDateAsc(userId, status);
  }

  @Transactional
  public FollowUpTask create(UUID userId, CreateFollowUpTaskRequest request) {
    return taskRepository.save(
        FollowUpTask.builder()
            .userId(userId)
            .applicationId(request.applicationId())
            .type(FollowUpTaskType.CUSTOM)
            .title(request.title())
            .dueDate(request.dueDate())
            .status(FollowUpTaskStatus.OPEN)
            .priority(request.priority() == null ? TaskPriority.MEDIUM : request.priority())
            .notes(request.notes())
            .build());
  }

  @Transactional
  public FollowUpTask setStatus(UUID userId, UUID taskId, FollowUpTaskStatus status) {
    FollowUpTask task =
        taskRepository
            .findByIdAndUserId(taskId, userId)
            .orElseThrow(() -> ResourceNotFoundException.of("Follow-up task", taskId));
    task.setStatus(status);
    if (status == FollowUpTaskStatus.DONE) {
      task.setCompletedAt(Instant.now());
    }
    return taskRepository.save(task);
  }

  /** Idempotent: won't duplicate a task of the same type for an application. */
  @Transactional
  public void generate(
      UUID userId, UUID applicationId, FollowUpTaskType type, String title, int leadDays, TaskPriority priority) {
    if (applicationId != null && taskRepository.existsByApplicationIdAndType(applicationId, type)) {
      return;
    }
    taskRepository.save(
        FollowUpTask.builder()
            .userId(userId)
            .applicationId(applicationId)
            .type(type)
            .title(title)
            .dueDate(Instant.now().plus(leadDays, ChronoUnit.DAYS))
            .status(FollowUpTaskStatus.OPEN)
            .priority(priority)
            .build());
  }

  // --- event hooks --------------------------------------------------------

  @Transactional
  public void onApplicationSubmitted(UUID userId, UUID applicationId) {
    String company = companyLabel(userId, applicationId);
    generate(
        userId,
        applicationId,
        FollowUpTaskType.APPLICATION_FOLLOW_UP,
        "Follow up on " + company + " application",
        properties.followUp().defaultLeadDays(),
        TaskPriority.MEDIUM);
  }

  @Transactional
  public void onRecruiterContacted(UUID userId, UUID applicationId) {
    generate(
        userId,
        applicationId,
        FollowUpTaskType.RECRUITER_FOLLOW_UP,
        "Follow up with recruiter at " + companyLabel(userId, applicationId),
        3,
        TaskPriority.HIGH);
  }

  @Transactional
  public void onInterviewScheduled(UUID userId, UUID applicationId) {
    generate(
        userId,
        applicationId,
        FollowUpTaskType.INTERVIEW_THANK_YOU,
        "Send thank-you note after " + companyLabel(userId, applicationId) + " interview",
        1,
        TaskPriority.HIGH);
    generate(
        userId,
        applicationId,
        FollowUpTaskType.INTERVIEW_FEEDBACK,
        "Chase interview feedback from " + companyLabel(userId, applicationId),
        5,
        TaskPriority.MEDIUM);
  }

  @Transactional
  public void onReferralInitiated(UUID userId, UUID applicationId) {
    generate(
        userId,
        applicationId,
        FollowUpTaskType.REFERRAL_FOLLOW_UP,
        "Follow up on referral at " + companyLabel(userId, applicationId),
        3,
        TaskPriority.MEDIUM);
  }

  // --- scheduled sweep --------------------------------------------------

  @Scheduled(fixedDelayString = "${job-tracker.follow-up.sweep-ms:900000}")
  @Transactional
  public void sweepDueTasks() {
    List<FollowUpTask> due =
        taskRepository.findAllByStatusAndNotifiedFalseAndDueDateBefore(
            FollowUpTaskStatus.OPEN, Instant.now());
    for (FollowUpTask task : due) {
      notificationService.push(
          task.getUserId(),
          "FOLLOW_UP_DUE",
          "Follow-up due: " + task.getTitle(),
          task.getNotes(),
          "FOLLOW_UP_TASK",
          task.getId());
      eventProducer.emit(
          JobEventTopics.FOLLOW_UP_DUE,
          task.getUserId(),
          Map.of("taskId", task.getId().toString(), "title", task.getTitle()));
      task.setNotified(true);
      taskRepository.save(task);
    }
    if (!due.isEmpty()) {
      log.info("swept {} due follow-up tasks", due.size());
    }
  }

  private String companyLabel(UUID userId, UUID applicationId) {
    return applicationRepository
        .findByIdAndUserId(applicationId, userId)
        .map(Application::getJobListingId)
        .flatMap(jobId -> jobListingRepository.findByIdAndUserId(jobId, userId))
        .map(JobListing::getCompany)
        .orElse("the company");
  }
}
