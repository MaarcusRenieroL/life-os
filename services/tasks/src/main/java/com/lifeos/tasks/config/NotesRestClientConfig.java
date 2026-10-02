package com.lifeos.tasks.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

// tasks' outbound call to notes, so notes stop linking to a deleted goal or task - same pattern as
// WorkoutsRestClientConfig.
@Configuration
public class NotesRestClientConfig {

  @Bean
  public RestClient notesRestClient(
      @Qualifier("internalRestClientBuilder") RestClient.Builder builder, @Value("${notes.internal-base-url}") String baseUrl) {
    return builder.clone().baseUrl(baseUrl).build();
  }
}
