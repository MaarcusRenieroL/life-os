package com.lifeos.job_tracker.config;

import java.time.Duration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

/**
 * Spring Boot 4 no longer always autoconfigures a {@link RestClient.Builder}; the outbound clients
 * (Resend, the Anthropic API, fetching a pasted job URL) inject one, so publish a plain builder
 * bean with sane connect/read timeouts so a slow remote page can't hang a request thread.
 */
@Configuration
public class HttpClientConfig {

  @Bean
  public RestClient.Builder restClientBuilder() {
    SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
    factory.setConnectTimeout(Duration.ofSeconds(10));
    factory.setReadTimeout(Duration.ofSeconds(20));
    return RestClient.builder().requestFactory(factory);
  }
}
