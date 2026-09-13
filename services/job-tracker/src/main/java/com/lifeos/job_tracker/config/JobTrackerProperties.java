package com.lifeos.job_tracker.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "job-tracker")
public record JobTrackerProperties(Storage storage) {

  public record Storage(String resumeDir) {}
}
