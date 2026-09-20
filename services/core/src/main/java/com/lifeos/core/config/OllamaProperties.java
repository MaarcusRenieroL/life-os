package com.lifeos.core.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "ollama")
public record OllamaProperties(String baseUrl, String model, Boolean enabled) {

  public boolean configured() {
    return Boolean.TRUE.equals(enabled);
  }
}
