package com.lifeos.job_tracker.domains.dto.request;

import com.lifeos.job_tracker.domains.enums.CoverLetterStyle;
import com.lifeos.job_tracker.domains.enums.CoverLetterTone;
import java.util.UUID;

public record GenerateCoverLetterRequest(
    CoverLetterTone tone, CoverLetterStyle style, UUID templateId, UUID resumeVariantId, String customInstructions) {}
