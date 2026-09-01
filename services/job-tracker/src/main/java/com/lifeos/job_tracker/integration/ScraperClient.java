package com.lifeos.job_tracker.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.lifeos.job_tracker.config.JobTrackerProperties;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/** Calls the job-scraper microservice, which returns already-normalised job payloads. */
@Component
@RequiredArgsConstructor
public class ScraperClient {

  private static final Logger log = LoggerFactory.getLogger(ScraperClient.class);

  private final JobTrackerProperties properties;
  private final RestClient.Builder restClientBuilder;

  @Value("${internal.api-key}")
  private String internalApiKey;

  /** Asks the scraper to run the given sources; returns the raw job array (may be empty). */
  public JsonNode scrape(UUID userId, List<Map<String, Object>> sources) {
    try {
      return restClientBuilder
          .build()
          .post()
          .uri(properties.scraper().baseUrl() + "/scrape")
          .header("X-Internal-Api-Key", internalApiKey)
          .header("Content-Type", "application/json")
          .body(Map.of("userId", userId.toString(), "sources", sources))
          .retrieve()
          .body(JsonNode.class);
    } catch (RestClientException exception) {
      log.warn("scraper call failed: {}", exception.getMessage());
      throw new com.lifeos.job_tracker.exception.InvalidRequestException(
          "Scraper service unavailable: " + exception.getMessage());
    }
  }
}
