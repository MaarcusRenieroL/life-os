package com.lifeos.tasks.domains.dto.request;

import com.lifeos.tasks.domains.enums.GoalReviewFrequency;
import com.lifeos.tasks.domains.enums.LifeArea;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/** Shared by create and update - update replaces every field, so the client always sends the
 * whole form (a null target date really means "no target date", not "leave it alone"). */
public record SaveGoalRequest(
    @NotBlank @Size(max = 200) String name,
    @Size(max = 5000) String description,
    LifeArea area,
    @Min(1) @Max(4) Integer priority,
    LocalDate startDate,
    LocalDate targetDate,
    GoalReviewFrequency reviewFrequency,
    @Min(1) @Max(14) Integer weeklyWorkoutTarget) {}
