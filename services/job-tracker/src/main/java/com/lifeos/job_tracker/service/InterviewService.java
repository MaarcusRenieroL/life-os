package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.dto.request.CreateInterviewRoundRequest;
import com.lifeos.job_tracker.domains.dto.request.UpdateInterviewRoundRequest;
import com.lifeos.job_tracker.domains.entity.Application;
import com.lifeos.job_tracker.domains.entity.InterviewRound;
import com.lifeos.job_tracker.domains.entity.JobListing;
import com.lifeos.job_tracker.domains.enums.InterviewStatus;
import com.lifeos.job_tracker.exception.ResourceNotFoundException;
import com.lifeos.job_tracker.integration.AiAssistant;
import com.lifeos.job_tracker.kafka.JobEventProducer;
import com.lifeos.job_tracker.kafka.JobEventTopics;
import com.lifeos.job_tracker.repository.ApplicationRepository;
import com.lifeos.job_tracker.repository.InterviewRoundRepository;
import com.lifeos.job_tracker.repository.JobListingRepository;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class InterviewService {

  private final InterviewRoundRepository interviewRoundRepository;
  private final ApplicationRepository applicationRepository;
  private final JobListingRepository jobListingRepository;
  private final AiAssistant ai;
  private final JobEventProducer eventProducer;

  @Transactional(readOnly = true)
  public List<InterviewRound> list(UUID userId, UUID applicationId) {
    requireApplication(userId, applicationId);
    return interviewRoundRepository.findAllByApplicationIdOrderByScheduledDateAsc(applicationId);
  }

  @Transactional
  public InterviewRound create(UUID userId, UUID applicationId, CreateInterviewRoundRequest request) {
    Application application = requireApplication(userId, applicationId);

    InterviewRound round =
        InterviewRound.builder()
            .applicationId(applicationId)
            .type(request.type())
            .scheduledDate(request.scheduledDate())
            .interviewerName(request.interviewerName())
            .meetingLink(request.meetingLink())
            .durationMinutes(request.durationMinutes())
            .preparationNotes(request.preparationNotes())
            .actualStatus(InterviewStatus.SCHEDULED)
            .build();

    if (Boolean.TRUE.equals(request.generateTopics()) && ai.available()) {
      JobListing job =
          jobListingRepository.findByIdAndUserId(application.getJobListingId(), userId).orElse(null);
      if (job != null && job.getJobDescriptionText() != null) {
        round.setTopics(ai.generateInterviewTopics(job.getJobDescriptionText(), request.type().name()));
      }
    }

    round = interviewRoundRepository.save(round);

    eventProducer.emit(
        JobEventTopics.INTERVIEW_SCHEDULED,
        userId,
        Map.of(
            "applicationId", applicationId.toString(),
            "interviewRoundId", round.getId().toString(),
            "type", request.type().name()));

    return round;
  }

  @Transactional
  public InterviewRound update(
      UUID userId, UUID applicationId, UUID roundId, UpdateInterviewRoundRequest request) {
    requireApplication(userId, applicationId);
    InterviewRound round =
        interviewRoundRepository
            .findByIdAndApplicationId(roundId, applicationId)
            .orElseThrow(() -> ResourceNotFoundException.of("Interview round", roundId));

    if (request.scheduledDate() != null) {
      round.setScheduledDate(request.scheduledDate());
    }
    if (request.interviewerName() != null) {
      round.setInterviewerName(request.interviewerName());
    }
    if (request.meetingLink() != null) {
      round.setMeetingLink(request.meetingLink());
    }
    if (request.durationMinutes() != null) {
      round.setDurationMinutes(request.durationMinutes());
    }
    if (request.topics() != null) {
      round.setTopics(request.topics());
    }
    if (request.preparationNotes() != null) {
      round.setPreparationNotes(request.preparationNotes());
    }
    if (request.actualStatus() != null) {
      round.setActualStatus(request.actualStatus());
      if (request.actualStatus() == InterviewStatus.COMPLETED && round.getCompletedAt() == null) {
        round.setCompletedAt(Instant.now());
      }
    }
    if (request.selfAssessmentScore() != null) {
      round.setSelfAssessmentScore(request.selfAssessmentScore());
    }
    if (request.postInterviewNotes() != null) {
      round.setPostInterviewNotes(request.postInterviewNotes());
    }
    return interviewRoundRepository.save(round);
  }

  private Application requireApplication(UUID userId, UUID applicationId) {
    return applicationRepository
        .findByIdAndUserId(applicationId, userId)
        .orElseThrow(() -> ResourceNotFoundException.of("Application", applicationId));
  }
}
