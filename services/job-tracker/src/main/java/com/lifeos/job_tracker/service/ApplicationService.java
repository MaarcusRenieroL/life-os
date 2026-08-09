package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.dto.request.BulkDeleteRequest;
import com.lifeos.job_tracker.domains.dto.request.BulkStageUpdateRequest;
import com.lifeos.job_tracker.domains.dto.request.CreateApplicationRequest;
import com.lifeos.job_tracker.domains.dto.request.ScoreApplicationRequest;
import com.lifeos.job_tracker.domains.dto.request.UpdateApplicationRequest;
import com.lifeos.job_tracker.domains.dto.response.ApplicationResponse;
import com.lifeos.job_tracker.domains.entity.Application;
import com.lifeos.job_tracker.domains.entity.Job;
import com.lifeos.job_tracker.domains.entity.ResumeTemplate;
import com.lifeos.job_tracker.domains.enums.ApplicationStage;
import com.lifeos.job_tracker.domains.enums.ApplicationStatus;
import com.lifeos.job_tracker.domains.record.BulletSection;
import com.lifeos.job_tracker.domains.record.JobScoreResult;
import com.lifeos.job_tracker.domains.record.ResumeTailoringResult;
import com.lifeos.job_tracker.exception.ApplicationNotFoundException;
import com.lifeos.job_tracker.exception.JobNotFoundException;
import com.lifeos.job_tracker.exception.ResumeNotFoundException;
import com.lifeos.job_tracker.publisher.ApplicationEventPublisher;
import com.lifeos.job_tracker.repository.ApplicationRepository;
import com.lifeos.job_tracker.repository.JobRepository;
import com.lifeos.job_tracker.repository.ResumeTemplateRepository;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Transactional
public class ApplicationService {

  @Value("${resume.storage-path}")
  private String resumeStoragePath;

  private final ApplicationRepository applicationRepository;
  private final JobRepository jobRepository;
  private final ResumeTemplateRepository resumeTemplateRepository;
  private final JobScoringService jobScoringService;
  private final ResumeTailoringService resumeTailoringService;
  private final PdfGenerationService pdfGenerationService;
  private final ApplicationEventPublisher applicationEventPublisher;

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
                request.getApplicationDate() != null ? request.getApplicationDate() : Instant.now())
            .resumeVersion(request.getResumeVersion())
            .coverLetterSubmitted(request.isCoverLetterSubmitted())
            .notes(request.getNotes())
            .currentStage(ApplicationStage.APPLIED)
            .status(ApplicationStatus.ACTIVE)
            .build();

    Application saved = applicationRepository.saveAndFlush(application);

    applicationEventPublisher.publishApplied(saved.getId(), saved.getJobId(), userId);

    return toResponse(saved);
  }

  public ApplicationResponse update(
      Authentication authentication, UUID id, UpdateApplicationRequest request) {
    UUID userId = (UUID) authentication.getPrincipal();

    Application application =
        applicationRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> new ApplicationNotFoundException(id));

    ApplicationStage previousStage = application.getCurrentStage();

    if (request.getCurrentStage() != null && !request.getCurrentStage().equals(previousStage)) {
      application.setCurrentStage(request.getCurrentStage());
      applicationEventPublisher.publishStageChanged(
          application.getId(),
          application.getJobId(),
          application.getUserId(),
          previousStage == null ? null : previousStage.name(),
          request.getCurrentStage().name());
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

    if (request.getReferralReceived() != null) {
      application.setReferralReceived(request.getReferralReceived());
    }

    if (StringUtils.hasText(request.getReferralNotes())) {
      application.setReferralNotes(request.getReferralNotes());
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

  public ApplicationResponse tailorResume(Authentication authentication, UUID id)
      throws IOException {
    UUID userId = (UUID) authentication.getPrincipal();

    Application application =
        applicationRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> new ApplicationNotFoundException(id));

    Job job =
        jobRepository
            .findById(application.getJobId())
            .orElseThrow(() -> new JobNotFoundException(application.getJobId()));

    ResumeTemplate resumeTemplate =
        resumeTemplateRepository
            .findByUserIdAndIsActiveTrue(userId)
            .orElseThrow(ResumeNotFoundException::new);

    ResumeTailoringResult result =
        resumeTailoringService.tailorResume(job, resumeTemplate.getResumeText());

    List<BulletSection> sections =
        List.of(
            new BulletSection("Experience Highlights", result.experienceBullets()),
            new BulletSection("Skills", result.skillsHighlight()));

    byte[] pdfBytes =
        pdfGenerationService.generateResumePdf(
            job.getJobTitle() + " - Tailored Resume", result.summary(), sections);

    Path userDir = Path.of(resumeStoragePath, userId.toString(), "applications");
    Files.createDirectories(userDir);
    Path filePath = userDir.resolve(application.getId() + ".pdf");
    Files.write(filePath, pdfBytes);

    application.setResumeS3Path(filePath.toString());
    application.setResumeGenerationTimestamp(Instant.now());

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

  // Mirrors the stage-change branch of update() per application so each one still
  // fires its own stage-change Kafka event/notification/email individually.
  public List<ApplicationResponse> bulkUpdateStage(
      Authentication authentication, BulkStageUpdateRequest request) {
    UUID userId = (UUID) authentication.getPrincipal();

    return request.getApplicationIds().stream()
        .map(
            id -> {
              Application application =
                  applicationRepository
                      .findByIdAndUserId(id, userId)
                      .orElseThrow(() -> new ApplicationNotFoundException(id));

              ApplicationStage previousStage = application.getCurrentStage();

              if (!request.getStage().equals(previousStage)) {
                application.setCurrentStage(request.getStage());
                applicationEventPublisher.publishStageChanged(
                    application.getId(),
                    application.getJobId(),
                    application.getUserId(),
                    previousStage == null ? null : previousStage.name(),
                    request.getStage().name());
              }

              return toResponse(applicationRepository.saveAndFlush(application));
            })
        .toList();
  }

  public void bulkDelete(Authentication authentication, BulkDeleteRequest request) {
    request.getApplicationIds().forEach(id -> delete(authentication, id));
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
            application.getCoverLetterSubmitted() != null && application.getCoverLetterSubmitted())
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
        .referralReceived(
            application.getReferralReceived() != null && application.getReferralReceived())
        .referralNotes(application.getReferralNotes())
        .createdAt(application.getCreatedAt())
        .updatedAt(application.getUpdatedAt())
        .build();
  }
}
