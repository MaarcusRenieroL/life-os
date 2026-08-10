package com.lifeos.common.ai;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;

@Configuration
public class ClaudeClientConfig {

  @Bean
  public RestClient claudeRestClient(@Value("${claude.api-key}") String apiKey) {
    return RestClient.builder()
        .baseUrl("https://api.anthropic.com")
        .defaultHeader("x-api-key", apiKey)
        .defaultHeader("anthropic-version", "2023-06-01")
        .defaultHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
        .build();
  }
}
