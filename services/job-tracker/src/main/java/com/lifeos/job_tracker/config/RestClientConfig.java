package com.lifeos.job_tracker.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
public class RestClientConfig {

  @Bean
  public RestClient ollamaRestClient(@Value("${ollama.base-url}") String baseUrl) {
    return RestClient.builder().baseUrl(baseUrl).build();
  }
}
