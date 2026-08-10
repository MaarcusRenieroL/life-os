package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.dto.request.CreateInterviewRequest;
import com.lifeos.job_tracker.domains.dto.request.UpdateInterviewRequest;
import com.lifeos.job_tracker.domains.dto.response.InterviewResponse;
import com.lifeos.job_tracker.domains.entity.Application;
import com.lifeos.job_tracker.domains.entity.ApplicationInterview;
import com.lifeos.job_tracker.exception.ApplicationNotFoundException;
import com.lifeos.job_tracker.exception.InterviewNotFoundException;
import com.lifeos.job_tracker.repository.ApplicationInterviewRepository;
import com.lifeos.job_tracker.repository.ApplicationRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

// Interviews are scoped to an application, which is itself scoped to a user, so
// every operation here first re-confirms the parent application belongs to the
// authenticated user before touching (or even reading) any interview row -
// otherwise an interview id alone would let one user read/edit another user's
// interview notes.
@Service
@RequiredArgsConstructor
@Transactional
public class InterviewService {

  private final ApplicationInterviewRepository interviewRepository;
  private final ApplicationRepository applicationRepository;

  public List<InterviewResponse> getAll(Authentication authentication, UUID applicationId) {
    Application application = requireOwnedApplication(authentication, applicationId);

    return interviewRepository.findAllByApplicationIdOrderByRoundAsc(application.getId()).stream()
        .map(this::toResponse)
        .toList();
  }

  public InterviewResponse create(
      Authentication authentication, UUID applicationId, CreateInterviewRequest request) {
    Application application = requireOwnedApplication(authentication, applicationId);

    ApplicationInterview interview =
        ApplicationInterview.builder()
            .applicationId(application.getId())
            .round(request.getRound())
            .roundName(request.getRoundName())
            .roundType(request.getRoundType())
            .scheduledDate(request.getScheduledDate())
            .scheduledTime(request.getScheduledTime())
            .meetingLink(request.getMeetingLink())
            .interviewerName(request.getInterviewerName())
            .interviewerTitle(request.getInterviewerTitle())
            .topics(request.getTopics())
            .preparationNotes(request.getPreparationNotes())
            .build();

    return toResponse(interviewRepository.saveAndFlush(interview));
  }

  public InterviewResponse update(
      Authentication authentication,
      UUID applicationId,
      UUID interviewId,
      UpdateInterviewRequest request) {
    Application application = requireOwnedApplication(authentication, applicationId);

    ApplicationInterview interview =
        interviewRepository
            .findByIdAndApplicationId(interviewId, application.getId())
            .orElseThrow(() -> new InterviewNotFoundException(interviewId));

    if (request.getRound() != null) {
      interview.setRound(request.getRound());
    }

    if (StringUtils.hasText(request.getRoundName())) {
      interview.setRoundName(request.getRoundName());
    }

    if (request.getRoundType() != null) {
      interview.setRoundType(request.getRoundType());
    }

    if (request.getScheduledDate() != null) {
      interview.setScheduledDate(request.getScheduledDate());
    }

    if (request.getScheduledTime() != null) {
      interview.setScheduledTime(request.getScheduledTime());
    }

    if (StringUtils.hasText(request.getMeetingLink())) {
      interview.setMeetingLink(request.getMeetingLink());
    }

    if (StringUtils.hasText(request.getInterviewerName())) {
      interview.setInterviewerName(request.getInterviewerName());
    }

    if (StringUtils.hasText(request.getInterviewerTitle())) {
      interview.setInterviewerTitle(request.getInterviewerTitle());
    }

    if (request.getTopics() != null) {
      interview.setTopics(request.getTopics());
    }

    if (StringUtils.hasText(request.getPreparationNotes())) {
      interview.setPreparationNotes(request.getPreparationNotes());
    }

    if (StringUtils.hasText(request.getQuestionsAsked())) {
      interview.setQuestionsAsked(request.getQuestionsAsked());
    }

    if (StringUtils.hasText(request.getPerformanceReview())) {
      interview.setPerformanceReview(request.getPerformanceReview());
    }

    if (request.getResult() != null) {
      interview.setResult(request.getResult());
    }

    if (request.getResultDate() != null) {
      interview.setResultDate(request.getResultDate());
    }

    if (StringUtils.hasText(request.getFeedback())) {
      interview.setFeedback(request.getFeedback());
    }

    return toResponse(interviewRepository.saveAndFlush(interview));
  }

  public void delete(Authentication authentication, UUID applicationId, UUID interviewId) {
    Application application = requireOwnedApplication(authentication, applicationId);

    ApplicationInterview interview =
        interviewRepository
            .findByIdAndApplicationId(interviewId, application.getId())
            .orElseThrow(() -> new InterviewNotFoundException(interviewId));

    interviewRepository.delete(interview);
  }

  private Application requireOwnedApplication(Authentication authentication, UUID applicationId) {
    UUID userId = (UUID) authentication.getPrincipal();

    return applicationRepository
        .findByIdAndUserId(applicationId, userId)
        .orElseThrow(() -> new ApplicationNotFoundException(applicationId));
  }

  private InterviewResponse toResponse(ApplicationInterview interview) {
    return InterviewResponse.builder()
        .id(interview.getId())
        .applicationId(interview.getApplicationId())
        .round(interview.getRound())
        .roundName(interview.getRoundName())
        .roundType(interview.getRoundType())
        .scheduledDate(interview.getScheduledDate())
        .scheduledTime(interview.getScheduledTime())
        .meetingLink(interview.getMeetingLink())
        .interviewerName(interview.getInterviewerName())
        .interviewerTitle(interview.getInterviewerTitle())
        .topics(interview.getTopics())
        .preparationNotes(interview.getPreparationNotes())
        .questionsAsked(interview.getQuestionsAsked())
        .performanceReview(interview.getPerformanceReview())
        .result(interview.getResult())
        .resultDate(interview.getResultDate())
        .feedback(interview.getFeedback())
        .createdAt(interview.getCreatedAt())
        .updatedAt(interview.getUpdatedAt())
        .build();
  }
}
