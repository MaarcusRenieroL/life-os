package com.lifeos.core.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

/** RestClient beans for the modules core fans out to for the Today aggregation view - one per
 * source service, same pattern as batches' RestClientConfig.
 *
 * <p>All four are built from common's {@code internalRestClientBuilder} (3s connect / 5s read) so
 * a wedged module can't pin a request thread: {@link com.lifeos.core.service.TodayService} calls
 * every one of these to render the home screen, and core's Hikari pool is only 6 connections. */
@Configuration
public class InternalRestClientConfig {

  @Bean
  public RestClient habitTrackerRestClient(
      @Qualifier("internalRestClientBuilder") RestClient.Builder builder,
      @Value("${habit-tracker.internal-base-url}") String baseUrl) {
    return builder.clone().baseUrl(baseUrl).build();
  }

  @Bean
  public RestClient jobTrackerRestClient(
      @Qualifier("internalRestClientBuilder") RestClient.Builder builder,
      @Value("${job-tracker.internal-base-url}") String baseUrl) {
    return builder.clone().baseUrl(baseUrl).build();
  }

  @Bean
  public RestClient financeTrackerRestClient(
      @Qualifier("internalRestClientBuilder") RestClient.Builder builder,
      @Value("${finance.internal-base-url}") String baseUrl) {
    return builder.clone().baseUrl(baseUrl).build();
  }

  @Bean
  public RestClient notesRestClient(
      @Qualifier("internalRestClientBuilder") RestClient.Builder builder,
      @Value("${notes.internal-base-url}") String baseUrl) {
    return builder.clone().baseUrl(baseUrl).build();
  }

  @Bean
  public RestClient tasksRestClient(
      @Qualifier("internalRestClientBuilder") RestClient.Builder builder,
      @Value("${tasks.internal-base-url}") String baseUrl) {
    return builder.clone().baseUrl(baseUrl).build();
  }

  @Bean
  public RestClient calendarRestClient(
      @Qualifier("internalRestClientBuilder") RestClient.Builder builder,
      @Value("${calendar.internal-base-url}") String baseUrl) {
    return builder.clone().baseUrl(baseUrl).build();
  }
}
