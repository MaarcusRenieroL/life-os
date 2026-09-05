package com.lifeos.job_tracker.domains.dto.request;

import com.lifeos.job_tracker.domains.enums.SkillCategory;
import com.lifeos.job_tracker.domains.enums.SkillProficiency;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;

public record UpsertSkillRequest(
    @NotBlank String name,
    SkillCategory category,
    SkillProficiency proficiency,
    BigDecimal yearsOfExperience) {}
