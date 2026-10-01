package com.lifeos.tasks.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

// tasks' outbound call to workouts, so a fitness goal's progress can include its linked workouts -
// same pattern as HabitTrackerRestClientConfig.
@Configuration
public class WorkoutsRestClientConfig {

  @Bean
  public RestClient workoutsRestClient(
      @Qualifier("internalRestClientBuilder") RestClient.Builder builder,
      @Value("${workouts.internal-base-url}") String baseUrl) {
    return builder.clone().baseUrl(baseUrl).build();
  }
}
