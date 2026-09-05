package com.lifeos.job_tracker.domains.dto.request;

import java.util.List;

public record UpdateResumeSectionRequest(
    String title, List<Object> content, Integer sortOrder, Boolean isHidden) {}
