package com.lifeos.job_tracker.domains.dto.request;

import com.lifeos.job_tracker.domains.enums.CoverLetterStyle;
import com.lifeos.job_tracker.domains.enums.CoverLetterTone;
import jakarta.validation.constraints.NotBlank;
import java.util.Map;

public record UpsertCoverLetterTemplateRequest(
    @NotBlank String name,
    String description,
    Map<String, Object> contentStructure,
    CoverLetterTone tone,
    CoverLetterStyle style) {}
