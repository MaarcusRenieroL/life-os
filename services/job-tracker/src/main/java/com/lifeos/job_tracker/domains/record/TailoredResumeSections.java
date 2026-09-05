package com.lifeos.job_tracker.domains.record;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record TailoredResumeSections(List<TailoredSection> sections) {

  @JsonIgnoreProperties(ignoreUnknown = true)
  public record TailoredSection(String sectionType, String title, List<Object> content) {}
}
