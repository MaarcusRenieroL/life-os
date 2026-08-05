package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.dto.request.CreateApplicationRequest;
import com.lifeos.job_tracker.domains.dto.request.ScoreApplicationRequest;
import com.lifeos.job_tracker.domains.dto.request.UpdateApplicationRequest;
import com.lifeos.job_tracker.domains.dto.response.ApplicationResponse;
import com.lifeos.job_tracker.domains.entity.Application;
import com.lifeos.job_tracker.domains.entity.Job;
import com.lifeos.job_tracker.domains.enums.ApplicationStage;
import com.lifeos.job_tracker.domains.enums.ApplicationStatus;
import com.lifeos.job_tracker.domains.record.JobScoreResult;
import com.lifeos.job_tracker.exception.ApplicationNotFoundException;
import com.lifeos.job_tracker.exception.JobNotFoundException;
import com.lifeos.job_tracker.repository.ApplicationRepository;
import com.lifeos.job_tracker.repository.JobRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Transactional
public class ApplicationService {

  private final ApplicationRepository applicationRepository;
  private final JobRepository jobRepository;
  private final JobScoringService jobScoringService;

  public List<ApplicationResponse> getAll(Authentication authentication) {
    UUID userId = (UUID) authentication.getPrincipal();

    return applicationRepository.findAllByUserId(userId).stream().map(this::toResponse).toList();
  }

  public ApplicationResponse get(Authentication authentication, UUID id) {
    UUID userId = (UUID) authentication.getPrincipal();

    return toResponse(
        applicationRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> new ApplicationNotFoundException(id)));
  }

  public ApplicationResponse save(Authentication authentication, CreateApplicationRequest request) {
    UUID userId = (UUID) authentication.getPrincipal();

    Application application =
        Application.builder()
            .userId(userId)
            .jobId(request.getJobId())
            .applicationDate(
                request.getApplicationDate() != null
                    ? request.getApplicationDate()
                    : Instant.now())
            .resumeVersion(request.getResumeVersion())
            .coverLetterSubmitted(request.isCoverLetterSubmitted())
            .notes(request.getNotes())
            .currentStage(ApplicationStage.APPLIED)
            .status(ApplicationStatus.ACTIVE)
            .build();

    // saveAndFlush (not save) - @CreationTimestamp/@UpdateTimestamp are only
    // populated by Hibernate at actual INSERT execution, which the
    // surrounding @Transactional would otherwise defer past this method
    // returning, leaving toResponse() reading null timestamps off the
    // in-memory entity.
    return toResponse(applicationRepository.saveAndFlush(application));
  }

  public ApplicationResponse update(
      Authentication authentication, UUID id, UpdateApplicationRequest request) {
    UUID userId = (UUID) authentication.getPrincipal();

    Application application =
        applicationRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> new ApplicationNotFoundException(id));

    if (request.getCurrentStage() != null) {
      application.setCurrentStage(request.getCurrentStage());
    }

    if (request.getStatus() != null) {
      application.setStatus(request.getStatus());
    }

    if (request.getCoverLetterSubmitted() != null) {
      application.setCoverLetterSubmitted(request.getCoverLetterSubmitted());
    }

    if (StringUtils.hasText(request.getRejectionReason())) {
      application.setRejectionReason(request.getRejectionReason());
    }

    if (request.getRejectionDate() != null) {
      application.setRejectionDate(request.getRejectionDate());
    }

    if (StringUtils.hasText(request.getWithdrawnReason())) {
      application.setWithdrawnReason(request.getWithdrawnReason());
    }

    if (request.getWithdrawnDate() != null) {
      application.setWithdrawnDate(request.getWithdrawnDate());
    }

    if (request.getLastFollowUpDate() != null) {
      application.setLastFollowUpDate(request.getLastFollowUpDate());
    }

    if (request.getNextFollowUpDate() != null) {
      application.setNextFollowUpDate(request.getNextFollowUpDate());
    }

    if (StringUtils.hasText(request.getNotes())) {
      application.setNotes(request.getNotes());
    }

    return toResponse(applicationRepository.saveAndFlush(application));
  }

  public ApplicationResponse score(
      Authentication authentication, UUID id, ScoreApplicationRequest request) {
    UUID userId = (UUID) authentication.getPrincipal();

    Application application =
        applicationRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> new ApplicationNotFoundException(id));

    Job job =
        jobRepository
            .findById(application.getJobId())
            .orElseThrow(() -> new JobNotFoundException(application.getJobId()));

    JobScoreResult result = jobScoringService.scoreApplication(job, request.getResumeText());

    application.setAiScorePercentage(result.scorePercentage());
    application.setAiScoreReasoning(result.reasoning());
    application.setAiRecommendedSections(result.recommendedSections());
    application.setAiInterviewPrepTopics(result.interviewPrepTopics());

    return toResponse(applicationRepository.saveAndFlush(application));
  }

  public void delete(Authentication authentication, UUID id) {
    UUID userId = (UUID) authentication.getPrincipal();

    Application application =
        applicationRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> new ApplicationNotFoundException(id));

    applicationRepository.delete(application);
  }

  private ApplicationResponse toResponse(Application application) {
    return ApplicationResponse.builder()
        .id(application.getId())
        .jobId(application.getJobId())
        .applicationDate(application.getApplicationDate())
        .resumeVersion(application.getResumeVersion())
        .resumeS3Path(application.getResumeS3Path())
        .resumeGenerationTimestamp(application.getResumeGenerationTimestamp())
        .resumeTailoringPrompt(application.getResumeTailoringPrompt())
        .resumeTailoringReasoning(application.getResumeTailoringReasoning())
        .coverLetterSubmitted(
            application.getCoverLetterSubmitted() != null
                && application.getCoverLetterSubmitted())
        .coverLetterS3Path(application.getCoverLetterS3Path())
        .aiScorePercentage(application.getAiScorePercentage())
        .aiScoreReasoning(application.getAiScoreReasoning())
        .aiRecommendedSections(application.getAiRecommendedSections())
        .aiInterviewPrepTopics(application.getAiInterviewPrepTopics())
        .linkedNoteIds(application.getLinkedNoteIds())
        .currentStage(application.getCurrentStage())
        .rejectionReason(application.getRejectionReason())
        .rejectionDate(application.getRejectionDate())
        .withdrawnReason(application.getWithdrawnReason())
        .withdrawnDate(application.getWithdrawnDate())
        .offerDetails(application.getOfferDetails())
        .lastFollowUpDate(application.getLastFollowUpDate())
        .nextFollowUpDate(application.getNextFollowUpDate())
        .status(application.getStatus())
        .notes(application.getNotes())
        .createdAt(application.getCreatedAt())
        .updatedAt(application.getUpdatedAt())
        .build();
  }
}
