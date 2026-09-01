package com.lifeos.job_tracker.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.job_tracker.config.JobTrackerProperties;
import com.lifeos.job_tracker.exception.InvalidRequestException;
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
  private final ObjectMapper objectMapper;

  @Value("${internal.api-key}")
  private String internalApiKey;

  /** Asks the scraper to run the given sources; returns {@code { jobs, notes }} (jobs may be empty). */
  public JsonNode scrape(UUID userId, List<Map<String, Object>> sources) {
    try {
      // Read as String and parse with the Jackson 2 mapper — Boot 4's RestClient message
      // converters are Jackson 3 and can't materialise a com.fasterxml JsonNode directly.
      String body =
          restClientBuilder
              .build()
              .post()
              .uri(properties.scraper().baseUrl() + "/scrape")
              .header("X-Internal-Api-Key", internalApiKey)
              .header("Content-Type", "application/json")
              .body(Map.of("userId", userId.toString(), "sources", sources))
              .retrieve()
              .body(String.class);
      return objectMapper.readTree(body == null ? "{}" : body);
    } catch (RestClientException | com.fasterxml.jackson.core.JacksonException exception) {
      log.warn("scraper call failed: {}", exception.getMessage());
      throw new InvalidRequestException("Scraper service unavailable: " + exception.getMessage());
    }
  }
}
