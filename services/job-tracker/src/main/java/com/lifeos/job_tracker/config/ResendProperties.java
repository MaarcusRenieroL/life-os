package com.lifeos.job_tracker.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "resend")
public record ResendProperties(String apiKey, String from) {

  public boolean configured() {
    return apiKey != null && !apiKey.isBlank();
  }
}
