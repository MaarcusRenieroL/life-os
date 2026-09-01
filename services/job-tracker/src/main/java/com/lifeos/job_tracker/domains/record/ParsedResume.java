package com.lifeos.job_tracker.domains.record;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ParsedResume(
    String name,
    String email,
    String phone,
    List<Experience> experience,
    List<Education> education,
    List<ExtractedSkill> skills,
    List<String> certifications,
    List<String> achievements) {

  @JsonIgnoreProperties(ignoreUnknown = true)
  public record Experience(
      String title, String company, String startDate, String endDate, String description) {}

  @JsonIgnoreProperties(ignoreUnknown = true)
  public record Education(String degree, String school, String field, String graduationYear) {}
}
