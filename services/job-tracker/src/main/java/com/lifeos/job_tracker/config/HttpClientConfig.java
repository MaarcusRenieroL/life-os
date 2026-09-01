package com.lifeos.job_tracker.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

/**
 * Spring Boot 4 no longer always autoconfigures a {@link RestClient.Builder}; the outbound clients
 * (Resend, the scraper microservice) inject one, so publish a plain builder bean.
 */
@Configuration
public class HttpClientConfig {

  @Bean
  public RestClient.Builder restClientBuilder() {
    return RestClient.builder();
  }
}
