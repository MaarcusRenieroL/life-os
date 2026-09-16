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
public class ClaudeApiClient implements AiClient {

  private static final Logger log = LoggerFactory.getLogger(ClaudeApiClient.class);

  private final AnthropicProperties properties;
  private final ObjectMapper objectMapper;
  private final RestClient restClient;
  private final AiUsageRecorder usageRecorder;

  public ClaudeApiClient(AnthropicProperties properties, ObjectMapper objectMapper, AiUsageRecorder usageRecorder) {
    this.properties = properties;
    this.objectMapper = objectMapper;
    this.usageRecorder = usageRecorder;
    this.restClient = RestClient.builder().baseUrl(properties.baseUrl()).build();
  }

  @Override
  public boolean isConfigured() {
    return properties.configured();
  }

  /** Returns the raw assistant text for a prompt. */
  @Override
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

      if (response.has("usage")) {
        JsonNode usage = response.get("usage");
        usageRecorder.record(
            properties.model(), usage.path("input_tokens").asInt(0), usage.path("output_tokens").asInt(0));
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
  @Override
  public JsonNode completeJson(String systemPrompt, String userPrompt) {
    String text = complete(systemPrompt, userPrompt);

    try {
      return objectMapper.readTree(LlmJsonExtractor.extract(text));
    } catch (Exception exception) {
      throw new ClaudeUnavailableException(
          "Could not parse JSON from Anthropic response: " + exception.getMessage(), exception);
    }
  }


  private void ensureConfigured() {
    if (!properties.configured()) {
      throw new ClaudeUnavailableException(
          "Anthropic API key is not configured (set ANTHROPIC_API_KEY)");
    }
  }
}
