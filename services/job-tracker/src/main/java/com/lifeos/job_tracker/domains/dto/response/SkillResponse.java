package com.lifeos.job_tracker.domains.dto.response;

import com.lifeos.job_tracker.domains.entity.Skill;
import java.math.BigDecimal;
import java.util.UUID;

public record SkillResponse(
    UUID id,
    String name,
    String category,
    String proficiency,
    BigDecimal yearsOfExperience,
    BigDecimal confidenceScore,
    String source) {

  public static SkillResponse from(Skill skill) {
    return new SkillResponse(
        skill.getId(),
        skill.getName(),
        skill.getCategory() == null ? null : skill.getCategory().name(),
        skill.getProficiency() == null ? null : skill.getProficiency().name(),
        skill.getYearsOfExperience(),
        skill.getConfidenceScore(),
        skill.getSource() == null ? null : skill.getSource().name());
  }
}
