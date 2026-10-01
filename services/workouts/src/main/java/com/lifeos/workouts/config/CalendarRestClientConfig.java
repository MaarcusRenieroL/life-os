package com.lifeos.workouts.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

// workouts' outbound call to calendar (see WorkoutCalendarSyncService) - same internalRestClientBuilder
// + per-service base-url pattern as job-tracker's CalendarRestClientConfig.
@Configuration
public class CalendarRestClientConfig {

  @Bean
  public RestClient calendarRestClient(
      @Qualifier("internalRestClientBuilder") RestClient.Builder builder,
      @Value("${calendar.internal-base-url}") String baseUrl) {
    return builder.clone().baseUrl(baseUrl).build();
  }
}
