package com.lifeos.tasks.domains.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/** completed is null on create and on a plain edit; the tick-box sends it explicitly. */
public record SaveMilestoneRequest(
    @NotBlank @Size(max = 200) String title, LocalDate targetDate, Boolean completed) {}
