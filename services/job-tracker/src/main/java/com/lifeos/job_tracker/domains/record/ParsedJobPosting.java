package com.lifeos.job_tracker.domains.record;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.math.BigDecimal;
import java.util.List;

/**
 * Everything Claude can pull out of a raw job page (JSON-LD, meta tags, or stripped body text) that
 * was fetched from a pasted URL. Any field may be null when the page didn't say.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record ParsedJobPosting(
    String title,
    String company,
    String location,
    String workModel,
    String seniorityLevel,
    String industry,
    BigDecimal salaryMin,
    BigDecimal salaryMax,
    String currency,
    List<String> requiredSkills,
    List<String> niceToHaveSkills,
    List<String> techStack,
    String jobDescriptionText) {}
