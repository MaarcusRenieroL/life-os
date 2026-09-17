package com.lifeos.job_tracker.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.job_tracker.config.OllamaProperties;
import com.lifeos.job_tracker.exception.ClaudeUnavailableException;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Thin wrapper over a local <a href="https://ollama.com">Ollama</a> server's chat endpoint - the
 * free, zero-marginal-cost alternative to Claude for the routine/high-volume prompts (see {@link
 * AiAssistant}'s per-task routing). Ollama runs on the developer's own machine, so "not
 * configured" here means "not enabled", not "no credentials" - there's nothing to pay for.
 */
@Component
public class OllamaApiClient implements AiClient {

  private static final Logger log = LoggerFactory.getLogger(OllamaApiClient.class);

  private final OllamaProperties properties;
  private final ObjectMapper objectMapper;
  private final RestClient restClient;

  public OllamaApiClient(OllamaProperties properties, ObjectMapper objectMapper) {
    this.properties = properties;
    this.objectMapper = objectMapper;
    this.restClient = RestClient.builder().baseUrl(properties.baseUrl()).build();
  }

  @Override
  public boolean isConfigured() {
    return properties.configured();
  }

  @Override
  public String complete(String systemPrompt, String userPrompt) {
    return chat(systemPrompt, userPrompt, null);
  }

  @Override
  public JsonNode completeJson(String systemPrompt, String userPrompt) {
    String text = chat(systemPrompt, userPrompt, "json");
    try {
      return objectMapper.readTree(LlmJsonExtractor.extract(text));
    } catch (Exception exception) {
      throw new ClaudeUnavailableException(
          "Could not parse JSON from Ollama response: " + exception.getMessage(), exception);
    }
  }

  private String chat(String systemPrompt, String userPrompt, String format) {
    if (!properties.configured()) {
      throw new ClaudeUnavailableException("Ollama is not enabled (set OLLAMA_ENABLED=true)");
    }

    Map<String, Object> body =
        new java.util.HashMap<>(
            Map.of(
                "model", properties.model(),
                "stream", false,
                "messages",
                    List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", userPrompt))));
    if (format != null) {
      body.put("format", format);
    }

    try {
      String raw = restClient.post().uri("/api/chat").body(body).retrieve().body(String.class);

      JsonNode response = raw == null ? null : objectMapper.readTree(raw);
      String content = response == null ? null : response.path("message").path("content").asText(null);
      if (content == null || content.isBlank()) {
        throw new ClaudeUnavailableException("Ollama returned an empty response");
      }
      return content;
    } catch (RestClientException exception) {
      log.warn("Ollama call failed: {}", exception.getMessage());
      throw new ClaudeUnavailableException("Ollama call failed: " + exception.getMessage(), exception);
    } catch (com.fasterxml.jackson.core.JsonProcessingException exception) {
      throw new ClaudeUnavailableException(
          "Could not read Ollama response body: " + exception.getMessage(), exception);
    }
  }
}
