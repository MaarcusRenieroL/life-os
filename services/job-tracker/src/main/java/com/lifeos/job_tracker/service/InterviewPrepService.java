package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.dto.request.CreateInterviewPrepRequest;
import com.lifeos.job_tracker.domains.entity.Application;
import com.lifeos.job_tracker.domains.entity.InterviewPrep;
import com.lifeos.job_tracker.domains.entity.InterviewRound;
import com.lifeos.job_tracker.domains.entity.JobListing;
import com.lifeos.job_tracker.domains.enums.InterviewType;
import com.lifeos.job_tracker.exception.ResourceNotFoundException;
import com.lifeos.job_tracker.integration.AiAssistant;
import com.lifeos.job_tracker.repository.ApplicationRepository;
import com.lifeos.job_tracker.repository.InterviewPrepRepository;
import com.lifeos.job_tracker.repository.InterviewRoundRepository;
import com.lifeos.job_tracker.repository.JobListingRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Auto-builds an interview prep checklist per round and lets the user tick items off. */
@Service
@RequiredArgsConstructor
public class InterviewPrepService {

  private static final Logger log = LoggerFactory.getLogger(InterviewPrepService.class);

  private final InterviewPrepRepository prepRepository;
  private final InterviewRoundRepository roundRepository;
  private final ApplicationRepository applicationRepository;
  private final JobListingRepository jobListingRepository;
  private final AiAssistant ai;

  @Transactional(readOnly = true)
  public List<InterviewPrep> list(UUID userId, UUID applicationId, UUID roundId) {
    requireRound(userId, applicationId, roundId);
    return prepRepository.findAllByInterviewRoundIdOrderByCreatedAtAsc(roundId);
  }

  @Transactional
  public InterviewPrep addItem(
      UUID userId, UUID applicationId, UUID roundId, CreateInterviewPrepRequest request) {
    requireRound(userId, applicationId, roundId);
    return prepRepository.save(
        InterviewPrep.builder()
            .interviewRoundId(roundId)
            .title(request.title())
            .description(request.description())
            .resourceLink(request.resourceLink())
            .build());
  }

  @Transactional
  public InterviewPrep toggle(UUID userId, UUID applicationId, UUID roundId, UUID prepId) {
    requireRound(userId, applicationId, roundId);
    InterviewPrep prep =
        prepRepository
            .findById(prepId)
            .filter(item -> item.getInterviewRoundId().equals(roundId))
            .orElseThrow(() -> ResourceNotFoundException.of("Interview prep item", prepId));
    prep.setCompleted(!prep.isCompleted());
    return prepRepository.save(prep);
  }

  /** Idempotent — does nothing if the round already has prep items. */
  @Transactional
  public void generateChecklist(UUID userId, UUID applicationId, UUID roundId) {
    InterviewRound round = roundRepository.findById(roundId).orElse(null);
    if (round == null || !prepRepository.findAllByInterviewRoundIdOrderByCreatedAtAsc(roundId).isEmpty()) {
      return;
    }
    JobListing job = jobFor(userId, round.getApplicationId());
    String company = job == null ? "the company" : job.getCompany();
    InterviewType type = round.getType() == null ? InterviewType.OTHER : round.getType();

    List<InterviewPrep> items = new ArrayList<>();
    items.add(item(roundId, "Research " + company, "Mission, product, recent news, Glassdoor/Blind reviews", null));
    items.add(item(roundId, "Prepare 3 questions for the interviewer", null, null));
    items.add(item(roundId, "Review the job description and map your experience to each requirement", null, null));

    switch (type) {
      case CODING, TAKE_HOME ->
          items.add(
              item(
                  roundId,
                  "Warm up on coding problems",
                  "Solve 3-5 problems at the level implied by the role",
                  "https://leetcode.com/problemset/"));
      case SYSTEM_DESIGN ->
          items.add(
              item(
                  roundId,
                  "Review system design fundamentals",
                  "Estimation, data modelling, caching, queues, trade-offs",
                  "https://github.com/donnemartin/system-design-primer"));
      case BEHAVIORAL, FINAL ->
          items.add(item(roundId, "Draft STAR stories", "Leadership, conflict, failure, impact", null));
      default -> {
        /* generic */
      }
    }

    if (ai.available() && job != null && job.getJobDescriptionText() != null) {
      try {
        for (String topic : ai.generateInterviewTopics(job.getJobDescriptionText(), type.name())) {
          items.add(item(roundId, topic, "Suggested by AI from the job description", null));
        }
      } catch (RuntimeException exception) {
        log.warn("interview topic generation failed for round {}: {}", roundId, exception.getMessage());
      }
    }

    prepRepository.saveAll(items);
    log.info("generated {} prep items for round {}", items.size(), roundId);
  }

  private static InterviewPrep item(UUID roundId, String title, String description, String link) {
    return InterviewPrep.builder()
        .interviewRoundId(roundId)
        .title(title)
        .description(description)
        .resourceLink(link)
        .build();
  }

  private JobListing jobFor(UUID userId, UUID applicationId) {
    return applicationRepository
        .findByIdAndUserId(applicationId, userId)
        .map(Application::getJobListingId)
        .flatMap(jobId -> jobListingRepository.findByIdAndUserId(jobId, userId))
        .orElse(null);
  }

  private InterviewRound requireRound(UUID userId, UUID applicationId, UUID roundId) {
    applicationRepository
        .findByIdAndUserId(applicationId, userId)
        .orElseThrow(() -> ResourceNotFoundException.of("Application", applicationId));
    return roundRepository
        .findByIdAndApplicationId(roundId, applicationId)
        .orElseThrow(() -> ResourceNotFoundException.of("Interview round", roundId));
  }
}
