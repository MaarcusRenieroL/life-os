package com.lifeos.job_tracker.domains.record;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ParsedJobDescription(
    List<String> requiredSkills,
    List<String> niceToHaveSkills,
    String seniorityLevel,
    String workModel,
    String industry,
    List<String> techStack) {}
