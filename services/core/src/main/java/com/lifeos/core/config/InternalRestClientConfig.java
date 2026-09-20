package com.lifeos.core.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

/** RestClient beans for the modules core fans out to for the Today aggregation view - one per
 * source service, same pattern as batches' RestClientConfig. */
@Configuration
public class InternalRestClientConfig {

  @Bean
  public RestClient habitTrackerRestClient(
      @Value("${habit-tracker.internal-base-url}") String baseUrl) {
    return RestClient.builder().baseUrl(baseUrl).build();
  }

  @Bean
  public RestClient jobTrackerRestClient(@Value("${job-tracker.internal-base-url}") String baseUrl) {
    return RestClient.builder().baseUrl(baseUrl).build();
  }

  @Bean
  public RestClient financeTrackerRestClient(@Value("${finance.internal-base-url}") String baseUrl) {
    return RestClient.builder().baseUrl(baseUrl).build();
  }

  @Bean
  public RestClient notesRestClient(@Value("${notes.internal-base-url}") String baseUrl) {
    return RestClient.builder().baseUrl(baseUrl).build();
  }
}
