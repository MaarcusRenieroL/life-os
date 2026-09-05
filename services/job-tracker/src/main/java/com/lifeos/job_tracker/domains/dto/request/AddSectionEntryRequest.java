package com.lifeos.job_tracker.domains.dto.request;

import jakarta.validation.constraints.NotNull;
import java.util.Map;

/** One entry (e.g. one job in EXPERIENCE, one degree in EDUCATION) within a section's content array. */
public record AddSectionEntryRequest(@NotNull Map<String, Object> entry) {}
