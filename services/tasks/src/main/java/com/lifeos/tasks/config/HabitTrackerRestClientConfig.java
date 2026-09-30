package com.lifeos.tasks.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

// tasks' outbound call to habit-tracker, so a goal's progress can include how consistently its
// linked habits are being done - same internalRestClientBuilder + per-service base-url pattern as
// job-tracker's CalendarRestClientConfig.
@Configuration
public class HabitTrackerRestClientConfig {

  @Bean
  public RestClient habitTrackerRestClient(
      @Qualifier("internalRestClientBuilder") RestClient.Builder builder,
      @Value("${habit-tracker.internal-base-url}") String baseUrl) {
    return builder.clone().baseUrl(baseUrl).build();
  }
}
