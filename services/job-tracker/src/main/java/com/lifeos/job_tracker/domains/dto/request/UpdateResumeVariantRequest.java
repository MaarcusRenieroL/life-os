package com.lifeos.job_tracker.domains.dto.request;

import com.lifeos.job_tracker.domains.enums.ResumeVisibility;
import com.lifeos.job_tracker.domains.enums.StylingTemplate;
import java.util.List;

public record UpdateResumeVariantRequest(
    String name,
    String description,
    Boolean isBase,
    Boolean isPublic,
    ResumeVisibility visibility,
    StylingTemplate stylingTemplate,
    String fontFamily,
    String accentColor,
    List<String> sectionOrder) {}
