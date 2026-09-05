package com.lifeos.job_tracker.domains.dto.request;

import com.lifeos.job_tracker.domains.enums.SectionType;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record CreateResumeSectionRequest(
    @NotNull SectionType sectionType, String title, List<Object> content, Integer sortOrder) {}
