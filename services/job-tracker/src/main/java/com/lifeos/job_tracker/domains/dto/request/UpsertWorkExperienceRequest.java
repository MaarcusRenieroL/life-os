package com.lifeos.job_tracker.domains.dto.request;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;
import java.util.List;

public record UpsertWorkExperienceRequest(
    @NotBlank String title,
    @NotBlank String company,
    String location,
    LocalDate startDate,
    LocalDate endDate,
    boolean current,
    List<String> bullets,
    int displayOrder) {}
