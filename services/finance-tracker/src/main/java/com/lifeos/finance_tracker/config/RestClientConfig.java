package com.lifeos.finance_tracker.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
public class RestClientConfig {

  // Built from common's aiRestClientBuilder (10s connect / 120s read) rather than the bare
  // RestClient.builder() static factory, which has no timeout at all - a hung Ollama would
  // otherwise pin this request's thread forever against a 6-connection pool. The generous read
  // timeout is deliberate: a local model can legitimately take a while to generate.
  @Bean
  public RestClient ollamaRestClient(
      @Qualifier("aiRestClientBuilder") RestClient.Builder builder,
      @Value("${ollama.base-url}") String baseUrl) {
    return builder.baseUrl(baseUrl).build();
  }
}
