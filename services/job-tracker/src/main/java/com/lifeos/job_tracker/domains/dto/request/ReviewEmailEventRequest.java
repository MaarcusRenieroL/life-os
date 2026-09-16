package com.lifeos.job_tracker.domains.dto.request;

import com.lifeos.job_tracker.domains.enums.JobStatus;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/**
 * {@code jobId} overrides/supplies the matched job (required if the event had none, e.g. an offer
 * email with no confident match); {@code status} overrides the suggested status (required for
 * OFFER, since accept/reject is never inferred from the email).
 */
public record ReviewEmailEventRequest(
    @NotNull EmailEventAction action, UUID jobId, JobStatus status) {

  public enum EmailEventAction {
    APPROVE,
    DISMISS
  }
}
