package com.lifeos.job_tracker.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "anthropic")
public record AnthropicProperties(
    String baseUrl, String apiKey, String model, String version, Integer maxTokens) {

  public boolean configured() {
    return apiKey != null && !apiKey.isBlank();
  }
}
