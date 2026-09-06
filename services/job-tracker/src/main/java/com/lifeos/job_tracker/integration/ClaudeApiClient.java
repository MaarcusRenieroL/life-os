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
      // Read the body as a String and parse with our own ObjectMapper - a bare
      // RestClient.builder() in Spring Boot 4 has no Jackson converter wired for
      // JsonNode, which fails with "Type definition error: ... JsonNode".
      String raw =
          restClient
              .post()
              .uri("/v1/messages")
              .header("x-api-key", properties.apiKey())
              .header("anthropic-version", properties.version())
              .header("content-type", "application/json")
              .body(body)
              .retrieve()
              .body(String.class);

      JsonNode response = raw == null ? null : objectMapper.readTree(raw);

      if (response == null || !response.has("content") || response.get("content").isEmpty()) {
        throw new ClaudeUnavailableException("Anthropic API returned an empty response");
      }

      // The content array may lead with a "thinking" block (extended thinking is
      // on by default for newer models) - pick the first "text" block, not [0].
      for (JsonNode block : response.get("content")) {
        if ("text".equals(block.path("type").asText()) && !block.path("text").asText().isBlank()) {
          return block.get("text").asText();
        }
      }
      throw new ClaudeUnavailableException("Anthropic API response had no text block");
    } catch (RestClientException exception) {
      log.warn("Anthropic API call failed: {}", exception.getMessage());
      throw new ClaudeUnavailableException("Anthropic API call failed: " + exception.getMessage(), exception);
    } catch (com.fasterxml.jackson.core.JsonProcessingException exception) {
      throw new ClaudeUnavailableException(
          "Could not read Anthropic response body: " + exception.getMessage(), exception);
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
    JsonNode json = completeJson(systemPrompt, userPrompt);
    try {
      return objectMapper.treeToValue(json, type);
    } catch (Exception exception) {
      log.warn(
          "Could not map Anthropic response to {}: {} -- payload was: {}",
          type.getSimpleName(),
          exception.getMessage(),
          json.toString());
      throw new ClaudeUnavailableException(
          "Could not map Anthropic response to "
              + type.getSimpleName()
              + ": "
              + exception.getMessage(),
          exception);
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
