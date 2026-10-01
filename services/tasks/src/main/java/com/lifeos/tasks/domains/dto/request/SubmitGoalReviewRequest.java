package com.lifeos.tasks.domains.dto.request;

import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record SubmitGoalReviewRequest(
    @Size(max = 5000) String progressSummary,
    @Size(max = 5000) String blockers,
    @Size(max = 5000) String nextSteps,
    @Size(max = 5000) String notes,
    LocalDate reviewDate) {}
