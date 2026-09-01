package com.lifeos.job_tracker.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.job_tracker.config.AnthropicProperties;
import com.lifeos.job_tracker.exception.ClaudeUnavailableException;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Thin wrapper over the Anthropic Messages API. Every method is a single-turn prompt; callers that
 * need JSON back get it through {@link #completeJson}, which tolerates the model wrapping the object
 * in prose or a ```json fence.
 *
 * <p>If {@code anthropic.api-key} is unset, {@link #ensureConfigured()} makes every call fail fast
 * with a 503 rather than a confusing 401 from the API.
 */
@Component
public class ClaudeApiClient {

  private static final Logger log = LoggerFactory.getLogger(ClaudeApiClient.class);

  private final AnthropicProperties properties;
  private final ObjectMapper objectMapper;
  private final RestClient restClient;

  public ClaudeApiClient(AnthropicProperties properties, ObjectMapper objectMapper) {
    this.properties = properties;
    this.objectMapper = objectMapper;
    this.restClient = RestClient.builder().baseUrl(properties.baseUrl()).build();
  }

  public boolean isConfigured() {
    return properties.configured();
  }

  /** Returns the raw assistant text for a prompt. */
  public String complete(String systemPrompt, String userPrompt) {
    ensureConfigured();

    Map<String, Object> body =
        Map.of(
            "model", properties.model(),
            "max_tokens", properties.maxTokens(),
            "system", systemPrompt,
            "messages", List.of(Map.of("role", "user", "content", userPrompt)));

    try {
      JsonNode response =
          restClient
              .post()
              .uri("/v1/messages")
              .header("x-api-key", properties.apiKey())
              .header("anthropic-version", properties.version())
              .header("content-type", "application/json")
              .body(body)
              .retrieve()
              .body(JsonNode.class);

      if (response == null || !response.has("content") || response.get("content").isEmpty()) {
        throw new ClaudeUnavailableException("Anthropic API returned an empty response");
      }

      return response.get("content").get(0).path("text").asText();
    } catch (RestClientException exception) {
      log.warn("Anthropic API call failed: {}", exception.getMessage());
      throw new ClaudeUnavailableException("Anthropic API call failed: " + exception.getMessage(), exception);
    }
  }

  /** Runs a prompt and parses the assistant's reply as a JSON object. */
  public JsonNode completeJson(String systemPrompt, String userPrompt) {
    String text = complete(systemPrompt, userPrompt);

    try {
      return objectMapper.readTree(extractJson(text));
    } catch (Exception exception) {
      throw new ClaudeUnavailableException(
          "Could not parse JSON from Anthropic response: " + exception.getMessage(), exception);
    }
  }

  public <T> T completeJson(String systemPrompt, String userPrompt, Class<T> type) {
    try {
      return objectMapper.treeToValue(completeJson(systemPrompt, userPrompt), type);
    } catch (Exception exception) {
      throw new ClaudeUnavailableException(
          "Could not map Anthropic response to " + type.getSimpleName(), exception);
    }
  }

  private void ensureConfigured() {
    if (!properties.configured()) {
      throw new ClaudeUnavailableException(
          "Anthropic API key is not configured (set ANTHROPIC_API_KEY)");
    }
  }

  private static String extractJson(String text) {
    String trimmed = text.trim();

    int fence = trimmed.indexOf("```");
    if (fence >= 0) {
      int start = trimmed.indexOf('\n', fence);
      int end = trimmed.lastIndexOf("```");
      if (start > 0 && end > start) {
        trimmed = trimmed.substring(start + 1, end).trim();
      }
    }

    int firstBrace = trimmed.indexOf('{');
    int firstBracket = trimmed.indexOf('[');
    int start =
        (firstBracket >= 0 && (firstBrace < 0 || firstBracket < firstBrace)) ? firstBracket : firstBrace;
    int lastBrace = trimmed.lastIndexOf('}');
    int lastBracket = trimmed.lastIndexOf(']');
    int end = Math.max(lastBrace, lastBracket);

    return (start >= 0 && end > start) ? trimmed.substring(start, end + 1) : trimmed;
  }
}
