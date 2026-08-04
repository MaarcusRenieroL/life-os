package com.lifeos.job_tracker.events;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record ScrapedJobEvent(
    String id,
    String userId,
    String company,
    String jobTitle,
    String location,
    String country,
    String workModel,
    BigDecimal salaryMin,
    BigDecimal salaryMax,
    String currency,
    String jobUrl,
    String jobDescription,
    String jobDescriptionHtml,
    String source,
    String sourceUrl,
    Instant scrapeTimestamp,
    List<String> requiredSkills,
    List<String> niceToHaveSkills,
    Integer experienceYears,
    String seniority,
    Instant applicationDeadline,
    String status,
    List<String> tags,
    String notes,
    Instant savedAt,
    Instant discoveredAt,
    Instant createdAt,
    Instant updatedAt,
    String deDuplicatedWithJobId) {}
