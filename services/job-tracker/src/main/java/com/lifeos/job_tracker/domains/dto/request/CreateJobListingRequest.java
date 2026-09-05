package com.lifeos.job_tracker.domains.dto.request;

import com.lifeos.job_tracker.domains.enums.SeniorityLevel;
import com.lifeos.job_tracker.domains.enums.VisaSponsorship;
import com.lifeos.job_tracker.domains.enums.WorkModel;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Manual job entry (Phase 1 has no scraper). All but title/company are optional. */
public record CreateJobListingRequest(
    @NotBlank String title,
    @NotBlank String company,
    String location,
    WorkModel workModel,
    String url,
    String source,
    String jobDescriptionText,
    BigDecimal salaryMin,
    BigDecimal salaryMax,
    String currency,
    LocalDate postedDate,
    LocalDate deadline,
    SeniorityLevel seniorityLevel,
    VisaSponsorship visaSponsorship,
    String industry,
    List<String> tags,
    Boolean parseWithAi) {}
