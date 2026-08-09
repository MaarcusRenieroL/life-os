package com.lifeos.job_tracker.domains.dto.response;

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
public class AnalyticsDashboardResponse {

  long totalJobs;

  long totalApplications;

  long activeApplications;

  long interviewingCount;

  long offerCount;

  double responseRate;

  double offerRate;
}
