package com.lifeos.job_tracker.integration;

import com.fasterxml.jackson.databind.JsonNode;

/** One provider capable of answering a single-turn prompt - implemented by {@link
 * ClaudeApiClient} and {@link OllamaApiClient} so {@link AiAssistant} can route each task to
 * whichever one it's configured for, independent of the domain-shaped prompt building. */
public interface AiClient {

  boolean isConfigured();

  /** Returns the raw assistant text for a prompt. */
  String complete(String systemPrompt, String userPrompt);

  /** Runs a prompt and parses the assistant's reply as a JSON object. */
  JsonNode completeJson(String systemPrompt, String userPrompt);
}
