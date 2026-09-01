package com.lifeos.job_tracker.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Spring Boot 4 autoconfigures a Jackson 3 ({@code tools.jackson}) mapper, not the Jackson 2
 * {@code com.fasterxml.jackson} one that the Anthropic SDK, our Kafka JSON (de)serializers and a few
 * services still use. Expose a configured Jackson 2 mapper so those injection points resolve.
 */
@Configuration
public class JacksonConfig {

  @Bean
  public ObjectMapper objectMapper() {
    return new ObjectMapper().findAndRegisterModules();
  }
}
