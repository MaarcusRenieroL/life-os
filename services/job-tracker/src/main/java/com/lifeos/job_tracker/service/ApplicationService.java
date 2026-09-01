package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.dto.request.CreateApplicationRequest;
import com.lifeos.job_tracker.domains.dto.request.UpdateApplicationRequest;
import com.lifeos.job_tracker.domains.dto.response.ApplicationDetailResponse;
import com.lifeos.job_tracker.domains.dto.response.ApplicationResponse;
import com.lifeos.job_tracker.domains.dto.response.InterviewRoundResponse;
import com.lifeos.job_tracker.domains.dto.response.JobListingResponse;
import com.lifeos.job_tracker.domains.dto.response.OfferResponse;
import com.lifeos.job_tracker.domains.dto.response.ReferralResponse;
import com.lifeos.job_tracker.domains.dto.response.StatusHistoryResponse;
import com.lifeos.job_tracker.domains.entity.Application;
import com.lifeos.job_tracker.domains.entity.ApplicationStatusHistory;
import com.lifeos.job_tracker.domains.entity.JobListing;
import com.lifeos.job_tracker.domains.enums.ApplicationStatus;
import com.lifeos.job_tracker.domains.enums.StatusChangeActor;
import com.lifeos.job_tracker.config.JobTrackerProperties;
import com.lifeos.job_tracker.exception.DuplicateResourceException;
import com.lifeos.job_tracker.exception.ResourceNotFoundException;
import com.lifeos.job_tracker.kafka.JobEventProducer;
import com.lifeos.job_tracker.kafka.JobEventTopics;
import com.lifeos.job_tracker.repository.ApplicationRepository;
import com.lifeos.job_tracker.repository.ApplicationStatusHistoryRepository;
import com.lifeos.job_tracker.repository.InterviewRoundRepository;
import com.lifeos.job_tracker.repository.JobListingRepository;
import com.lifeos.job_tracker.repository.OfferRepository;
import com.lifeos.job_tracker.repository.ReferralRepository;
import com.lifeos.job_tracker.repository.ResumeRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ApplicationService {

  private final ApplicationRepository applicationRepository;
  private final ApplicationStatusHistoryRepository statusHistoryRepository;
  private final JobListingRepository jobListingRepository;
  private final ResumeRepository resumeRepository;
  private final InterviewRoundRepository interviewRoundRepository;
  private final ReferralRepository referralRepository;
  private final OfferRepository offerRepository;
  private final JobEventProducer eventProducer;
  private final JobTrackerProperties properties;

  @Transactional(readOnly = true)
  public List<Application> list(UUID userId, ApplicationStatus status) {
    return status == null
        ? applicationRepository.findAllByUserIdOrderByCreatedAtDesc(userId)
        : applicationRepository.findAllByUserIdAndStatusOrderByApplicationDateDesc(userId, status);
  }

  @Transactional(readOnly = true)
  public Application get(UUID userId, UUID applicationId) {
    return applicationRepository
        .findByIdAndUserId(applicationId, userId)
        .orElseThrow(() -> ResourceNotFoundException.of("Application", applicationId));
  }

  @Transactional(readOnly = true)
  public List<Application> needingFollowUp(UUID userId) {
    return applicationRepository.findNeedingFollowUp(userId, Instant.now());
  }

  @Transactional
  public Application create(UUID userId, CreateApplicationRequest request) {
    JobListing job =
        jobListingRepository
            .findByIdAndUserId(request.jobListingId(), userId)
            .orElseThrow(() -> ResourceNotFoundException.of("Job listing", request.jobListingId()));

    if (applicationRepository.existsByUserIdAndJobListingId(userId, job.getId())) {
      throw new DuplicateResourceException("You already have an application for this job");
    }

    if (request.resumeId() != null) {
      resumeRepository
          .findByIdAndUserId(request.resumeId(), userId)
          .orElseThrow(() -> ResourceNotFoundException.of("Resume", request.resumeId()));
    }

    Instant now = Instant.now();
    Application application =
        applicationRepository.save(
            Application.builder()
                .userId(userId)
                .jobListingId(job.getId())
                .resumeId(request.resumeId())
                .status(ApplicationStatus.APPLIED)
                .applicationMethod(request.applicationMethod())
                .applicationDate(now)
                .coverLetterText(request.coverLetterText())
                .customMessageText(request.customMessageText())
                .followUpReminderDate(now.plus(properties.followUp().defaultLeadDays(), ChronoUnit.DAYS))
                .notes(request.notes())
                .build());

    recordStatusChange(application.getId(), null, ApplicationStatus.APPLIED, "Application created", StatusChangeActor.USER);

    job.setSaved(true);
    jobListingRepository.save(job);

    eventProducer.emit(
        JobEventTopics.APPLICATION_SUBMITTED,
        userId,
        java.util.Map.of(
            "applicationId", application.getId().toString(),
            "jobId", job.getId().toString(),
            "resumeVersionId", String.valueOf(request.resumeId())));
    eventProducer.emit(
        JobEventTopics.JOB_SCORING,
        userId,
        java.util.Map.of("jobId", job.getId().toString(), "applicationId", application.getId().toString()));

    return application;
  }

  @Transactional
  public Application updateStatus(UUID userId, UUID applicationId, String rawStatus, String note) {
    Application application = get(userId, applicationId);
    ApplicationStatus target = ApplicationStatus.fromValue(rawStatus);
    ApplicationStatus previous = application.getStatus();

    if (target == previous) {
      return application;
    }

    application.setStatus(target);
    if (target == ApplicationStatus.REJECTED && note != null) {
      application.setRejectionReason(note);
    }
    applicationRepository.save(application);
    recordStatusChange(applicationId, previous, target, note, StatusChangeActor.USER);

    if (isInterviewStage(target)) {
      eventProducer.emit(
          JobEventTopics.INTERVIEW_SCHEDULED,
          userId,
          java.util.Map.of("applicationId", applicationId.toString(), "stage", target.value()));
    }

    return application;
  }

  @Transactional
  public Application update(UUID userId, UUID applicationId, UpdateApplicationRequest request) {
    Application application = get(userId, applicationId);

    if (request.resumeId() != null) {
      resumeRepository
          .findByIdAndUserId(request.resumeId(), userId)
          .orElseThrow(() -> ResourceNotFoundException.of("Resume", request.resumeId()));
      application.setResumeId(request.resumeId());
    }
    if (request.coverLetterText() != null) {
      application.setCoverLetterText(request.coverLetterText());
    }
    if (request.notes() != null) {
      application.setNotes(request.notes());
    }
    if (request.rejectionReason() != null) {
      application.setRejectionReason(request.rejectionReason());
    }
    if (request.followUpReminderDate() != null) {
      application.setFollowUpReminderDate(request.followUpReminderDate());
    }
    return applicationRepository.save(application);
  }

  @Transactional
  public void delete(UUID userId, UUID applicationId) {
    Application application = get(userId, applicationId);
    applicationRepository.delete(application);
  }

  @Transactional(readOnly = true)
  public ApplicationDetailResponse detail(UUID userId, UUID applicationId) {
    Application application = get(userId, applicationId);
    JobListing job =
        jobListingRepository
            .findByIdAndUserId(application.getJobListingId(), userId)
            .orElseThrow(() -> ResourceNotFoundException.of("Job listing", application.getJobListingId()));

    List<StatusHistoryResponse> history =
        statusHistoryRepository.findAllByApplicationIdOrderByChangedAtDesc(applicationId).stream()
            .map(StatusHistoryResponse::from)
            .toList();
    List<InterviewRoundResponse> interviews =
        interviewRoundRepository.findAllByApplicationIdOrderByScheduledDateAsc(applicationId).stream()
            .map(InterviewRoundResponse::from)
            .toList();
    List<ReferralResponse> referrals =
        referralRepository.findAllByApplicationIdOrderByCreatedAtDesc(applicationId).stream()
            .map(ReferralResponse::from)
            .toList();
    OfferResponse offer =
        offerRepository.findByApplicationId(applicationId).map(OfferResponse::from).orElse(null);

    return new ApplicationDetailResponse(
        ApplicationResponse.from(application),
        JobListingResponse.from(job),
        history,
        interviews,
        referrals,
        offer);
  }

  private void recordStatusChange(
      UUID applicationId,
      ApplicationStatus from,
      ApplicationStatus to,
      String note,
      StatusChangeActor actor) {
    statusHistoryRepository.save(
        ApplicationStatusHistory.builder()
            .applicationId(applicationId)
            .oldStatus(from == null ? null : from.value())
            .newStatus(to.value())
            .note(note)
            .changedBy(actor)
            .build());
  }

  private static boolean isInterviewStage(ApplicationStatus status) {
    return status == ApplicationStatus.SCREENING
        || status == ApplicationStatus.TECHNICAL_INTERVIEW
        || status == ApplicationStatus.SYSTEM_DESIGN_INTERVIEW
        || status == ApplicationStatus.FINAL_INTERVIEW;
  }
}
