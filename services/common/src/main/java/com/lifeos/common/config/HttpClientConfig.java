package com.lifeos.common.config;

import java.time.Duration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

/**
 * Spring Boot 4 no longer always autoconfigures a {@link RestClient.Builder}. Every outbound
 * HTTP client in this codebase (AI calls to Ollama/Claude, service-to-service internal calls,
 * fetching a pasted job URL, Gmail API calls) needs one with a timeout, or a hung remote can pin
 * a request thread forever - the connection pool per service is only 6 (see each service's
 * application.yaml), so a handful of hung calls exhausts it.
 *
 * <p>Two beans, not one, because AI calls and internal service-to-service calls have very
 * different acceptable latencies: an internal call is same-network and should fail fast; an AI
 * call routes through a local Ollama model or the Anthropic API and can legitimately take over a
 * minute for a long response (job-tracker's Claude client allows up to 16384 output tokens).
 * Every service that builds a specific client (Claude, Ollama, Gmail, an internal peer) should
 * inject the matching bean by name via {@code @Qualifier} and call {@code .baseUrl(...).build()}
 * on it, rather than calling the bare {@code RestClient.builder()} static factory (which has no
 * timeout at all).
 */
@Configuration
public class HttpClientConfig {

  @Bean
  public RestClient.Builder internalRestClientBuilder() {
    SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
    factory.setConnectTimeout(Duration.ofSeconds(3));
    factory.setReadTimeout(Duration.ofSeconds(5));
    return RestClient.builder().requestFactory(factory);
  }

  @Bean
  public RestClient.Builder aiRestClientBuilder() {
    SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
    factory.setConnectTimeout(Duration.ofSeconds(10));
    factory.setReadTimeout(Duration.ofSeconds(120));
    return RestClient.builder().requestFactory(factory);
  }
}
