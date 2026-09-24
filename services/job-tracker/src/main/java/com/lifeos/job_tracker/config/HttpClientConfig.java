package com.lifeos.job_tracker.config;

import java.time.Duration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

/**
 * A third timeout profile alongside common's {@code internalRestClientBuilder} (3s/5s, for
 * same-network service-to-service calls) and {@code aiRestClientBuilder} (10s/120s, for Ollama/
 * Claude). {@link com.lifeos.job_tracker.integration.JobLinkFetcher} fetches an arbitrary,
 * user-pasted external job-board URL - not an internal peer, so 3s/5s is too tight (a normal but
 * slow page load would spuriously fail), and not an AI call, so 120s is needlessly generous for
 * something that has a paste-the-description fallback if it times out.
 */
@Configuration
public class HttpClientConfig {

  @Bean
  public RestClient.Builder externalFetchRestClientBuilder() {
    SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
    factory.setConnectTimeout(Duration.ofSeconds(10));
    factory.setReadTimeout(Duration.ofSeconds(20));
    return RestClient.builder().requestFactory(factory);
  }
}
