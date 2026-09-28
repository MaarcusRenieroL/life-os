package com.lifeos.job_tracker.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

// job-tracker's first outbound call to another module (see InterviewCalendarSyncService) - same
// internalRestClientBuilder + per-service base-url pattern as batches' RestClientConfig and
// core's InternalRestClientConfig.
@Configuration
public class CalendarRestClientConfig {

  @Bean
  public RestClient calendarRestClient(
      @Qualifier("internalRestClientBuilder") RestClient.Builder builder,
      @Value("${calendar.internal-base-url}") String baseUrl) {
    return builder.clone().baseUrl(baseUrl).build();
  }
}
