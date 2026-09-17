package com.lifeos.job_tracker.domains.dto.request;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;
import java.util.List;

public record UpsertProjectRequest(
    @NotBlank String name,
    String description,
    List<String> techStack,
    String link,
    LocalDate startDate,
    LocalDate endDate,
    List<String> bullets,
    int displayOrder) {}
