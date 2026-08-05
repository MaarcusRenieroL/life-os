package com.lifeos.job_tracker.domains.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateApplicationRequest {

  @NotNull UUID jobId;

  Instant applicationDate;

  @Size(max = 50)
  String resumeVersion;

  boolean coverLetterSubmitted;

  @Size(max = 2000)
  String notes;
}
