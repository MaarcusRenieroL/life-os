package com.lifeos.job_tracker.domains.dto.request;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Normalised job payload produced by the scraper microservice or a manual import. */
public record ScrapedJob(
    String externalId,
    String title,
    String company,
    String location,
    String workModel,
    String url,
    String jobDescriptionText,
    String source,
    BigDecimal salaryMin,
    BigDecimal salaryMax,
    String currency,
    LocalDate postedDate,
    String seniorityLevel,
    String industry,
    List<String> tags,
    String recruiterEmail) {}
