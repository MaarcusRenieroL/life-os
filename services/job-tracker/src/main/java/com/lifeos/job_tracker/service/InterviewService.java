package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.dto.request.UpsertInterviewRequest;
import com.lifeos.job_tracker.domains.entity.Interview;
import com.lifeos.job_tracker.domains.entity.JobListing;
import com.lifeos.job_tracker.domains.entity.Resume;
import com.lifeos.job_tracker.domains.enums.InterviewResult;
import com.lifeos.job_tracker.domains.enums.InterviewRoundType;
import com.lifeos.job_tracker.exception.InvalidRequestException;
import com.lifeos.job_tracker.exception.ResourceNotFoundException;
import com.lifeos.job_tracker.integration.AiAssistant;
import com.lifeos.job_tracker.repository.InterviewRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class InterviewService {

  private final InterviewRepository interviewRepository;
  private final JobListingService jobListingService;
  private final ResumeService resumeService;
  private final AiAssistant ai;

  @Transactional(readOnly = true)
  public List<Interview> list(UUID userId, UUID jobId) {
    jobListingService.get(userId, jobId); // 404s if the job isn't the caller's
    return interviewRepository.findByJobIdAndUserIdOrderByScheduledAtAsc(jobId, userId);
  }

  @Transactional(readOnly = true)
  public Interview get(UUID userId, UUID interviewId) {
    return interviewRepository
        .findByIdAndUserId(interviewId, userId)
        .orElseThrow(() -> ResourceNotFoundException.of("Interview", interviewId));
  }

  @Transactional
  public Interview create(UUID userId, UUID jobId, UpsertInterviewRequest request) {
    JobListing job = jobListingService.get(userId, jobId);
    Interview interview =
        Interview.builder()
            .jobId(job.getId())
            .userId(userId)
            .roundType(parseRoundType(request.roundType()))
            .scheduledAt(request.scheduledAt())
            .interviewerName(request.interviewerName())
            .meetingLink(request.meetingLink())
            .preparationNotes(request.preparationNotes())
            .questionsAsked(request.questionsAsked())
            .performanceNotes(request.performanceNotes())
            .result(parseResult(request.result()))
            .build();
    return interviewRepository.save(interview);
  }

  @Transactional
  public Interview update(UUID userId, UUID interviewId, UpsertInterviewRequest request) {
    Interview interview = get(userId, interviewId);
    interview.setRoundType(parseRoundType(request.roundType()));
    interview.setScheduledAt(request.scheduledAt());
    interview.setInterviewerName(request.interviewerName());
    interview.setMeetingLink(request.meetingLink());
    interview.setPreparationNotes(request.preparationNotes());
    interview.setQuestionsAsked(request.questionsAsked());
    interview.setPerformanceNotes(request.performanceNotes());
    interview.setResult(parseResult(request.result()));
    return interviewRepository.save(interview);
  }

  /** Asks the AI for concrete prep topics for this round, grounded in the job posting and the
   * candidate's current resume when one is on file. */
  @Transactional
  public Interview generatePrepTopics(UUID userId, UUID interviewId) {
    Interview interview = get(userId, interviewId);
    JobListing job = jobListingService.get(userId, interview.getJobId());
    if (!ai.available()) {
      throw new InvalidRequestException(
          "Generating prep topics needs an AI provider; set ANTHROPIC_API_KEY or enable Ollama");
    }

    String resumeText = null;
    try {
      Resume resume = resumeService.getCurrent(userId);
      resumeText = resume.getRawText();
    } catch (ResourceNotFoundException exception) {
      // No resume on file yet - prep topics are still useful from the job description alone.
    }

    List<String> topics =
        ai.generateInterviewPrepTopics(
            interview.getRoundType() == null ? "TECHNICAL" : interview.getRoundType().name(),
            job.getTitle(),
            job.getCompany(),
            job.getJobDescriptionText(),
            resumeText);
    interview.setTopics(topics);
    return interviewRepository.save(interview);
  }

  @Transactional
  public void delete(UUID userId, UUID interviewId) {
    interviewRepository.delete(get(userId, interviewId));
  }

  private static InterviewRoundType parseRoundType(String raw) {
    if (raw == null || raw.isBlank()) {
      throw new InvalidRequestException("roundType is required");
    }
    try {
      return InterviewRoundType.valueOf(raw.trim().toUpperCase());
    } catch (IllegalArgumentException exception) {
      throw new InvalidRequestException("Unknown interview round type: " + raw);
    }
  }

  private static InterviewResult parseResult(String raw) {
    if (raw == null || raw.isBlank()) {
      return InterviewResult.PENDING;
    }
    try {
      return InterviewResult.valueOf(raw.trim().toUpperCase());
    } catch (IllegalArgumentException exception) {
      throw new InvalidRequestException("Unknown interview result: " + raw);
    }
  }
}
