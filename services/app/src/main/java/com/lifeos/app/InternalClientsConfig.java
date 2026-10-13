package com.lifeos.app;

import java.time.Duration;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

/**
 * RestClients for module-to-module calls. They still go over HTTP (to this same process, on
 * {@code localhost}) through each module's {@code /internal} endpoints, so the modules stay
 * decoupled from each other's classes. Every module used to declare the clients it needed;
 * declaring each once here is what lets them share one context (several modules built an identical
 * {@code calendarRestClient}).
 */
@Configuration
public class InternalClientsConfig {

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

  @Bean
  public RestClient workoutsRestClient(
      @Qualifier("internalRestClientBuilder") RestClient.Builder builder,
      @Value("${workouts.internal-base-url}") String baseUrl) {
    return builder.clone().baseUrl(baseUrl).build();
  }

  @Bean
  public RestClient vaultRestClient(
      @Qualifier("internalRestClientBuilder") RestClient.Builder builder,
      @Value("${vault.internal-base-url}") String baseUrl) {
    return builder.clone().baseUrl(baseUrl).build();
  }

  /**
   * Batches' statement imports: finance categorizes, merchant-matches and inserts a whole parsed
   * statement (100-400 rows) in one transaction before replying, which legitimately takes far
   * longer than the 5s read timeout of the other internal clients. Connect stays fast.
   */
  @Bean
  public RestClient financeImportRestClient(
      @Qualifier("internalRestClientBuilder") RestClient.Builder builder,
      @Value("${finance.internal-base-url}") String baseUrl) {
    SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
    factory.setConnectTimeout(Duration.ofSeconds(3));
    factory.setReadTimeout(Duration.ofSeconds(120));
    return builder.clone().baseUrl(baseUrl).requestFactory(factory).build();
  }

  /** Finance's merchant clustering asks the local model; AI calls get the long read timeout. */
  @Bean
  public RestClient ollamaRestClient(
      @Qualifier("aiRestClientBuilder") RestClient.Builder builder,
      @Value("${ollama.base-url}") String baseUrl) {
    return builder.clone().baseUrl(baseUrl).build();
  }
}
