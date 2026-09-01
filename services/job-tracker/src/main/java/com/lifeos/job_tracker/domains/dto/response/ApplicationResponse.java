package com.lifeos.job_tracker.domains.dto.response;

import com.lifeos.job_tracker.domains.entity.Application;
import com.lifeos.job_tracker.domains.entity.JobListing;
import java.time.Instant;
import java.util.UUID;

public record ApplicationResponse(
    UUID id,
    UUID jobListingId,
    UUID resumeId,
    String company,
    String jobTitle,
    String status,
    String applicationMethod,
    Instant applicationDate,
    Instant followUpReminderDate,
    String rejectionReason,
    String notes,
    Instant createdAt,
    Instant updatedAt) {

  public static ApplicationResponse from(Application application) {
    return from(application, null);
  }

  public static ApplicationResponse from(Application application, JobListing job) {
    return new ApplicationResponse(
        application.getId(),
        application.getJobListingId(),
        application.getResumeId(),
        job == null ? null : job.getCompany(),
        job == null ? null : job.getTitle(),
        application.getStatus() == null ? null : application.getStatus().value(),
        application.getApplicationMethod() == null ? null : application.getApplicationMethod().name(),
        application.getApplicationDate(),
        application.getFollowUpReminderDate(),
        application.getRejectionReason(),
        application.getNotes(),
        application.getCreatedAt(),
        application.getUpdatedAt());
  }
}
