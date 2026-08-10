package com.lifeos.job_tracker.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;

@Configuration
public class RestClientConfig {

  @Bean
  public RestClient resendRestClient(@Value("${resend.api-key}") String apiKey) {
    return RestClient.builder()
        .baseUrl("https://api.resend.com")
        .defaultHeader("Authorization", "Bearer " + apiKey)
        .defaultHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
        .build();
  }

  @Bean
  public RestClient jobScraperRestClient(@Value("${job-scraper.base-url}") String baseUrl) {
    return RestClient.builder().baseUrl(baseUrl).build();
  }
}
