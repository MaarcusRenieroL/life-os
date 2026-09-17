package com.lifeos.job_tracker.integration;

import com.lifeos.job_tracker.domains.entity.AiUsageLog;
import com.lifeos.job_tracker.repository.AiUsageLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/** Persists one row per completed Claude call so spend can be shown without the Admin API. Best
 * effort by design - a logging failure must never take down the actual AI call it's recording. */
@Component
public class AiUsageRecorder {

  private static final Logger log = LoggerFactory.getLogger(AiUsageRecorder.class);

  private final AiUsageLogRepository repository;

  public AiUsageRecorder(AiUsageLogRepository repository) {
    this.repository = repository;
  }

  void record(String model, int inputTokens, int outputTokens) {
    try {
      repository.save(
          AiUsageLog.builder()
              .model(model)
              .inputTokens(inputTokens)
              .outputTokens(outputTokens)
              .estimatedCostUsd(ClaudePricing.estimateCostUsd(model, inputTokens, outputTokens))
              .build());
    } catch (RuntimeException exception) {
      log.warn("Could not record AI usage: {}", exception.getMessage());
    }
  }
}
