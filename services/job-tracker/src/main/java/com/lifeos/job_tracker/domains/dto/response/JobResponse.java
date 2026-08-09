package com.lifeos.job_tracker.domains.dto.response;

import com.lifeos.job_tracker.domains.enums.JobSource;
import com.lifeos.job_tracker.domains.enums.JobStatus;
import com.lifeos.job_tracker.domains.enums.Seniority;
import com.lifeos.job_tracker.domains.enums.WorkModel;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class JobResponse {

  UUID id;

  String company;

  String jobTitle;

  String location;

  String country;

  WorkModel workModel;

  BigDecimal salaryMin;

  BigDecimal salaryMax;

  String currency;

  String jobUrl;

  String jobDescription;

  JobSource source;

  String sourceUrl;

  List<String> requiredSkills;

  List<String> niceToHaveSkills;

  Seniority seniority;

  JobStatus status;

  List<String> tags;

  String notes;

  Instant createdAt;

  Instant updatedAt;
}
