package com.lifeos.common.ai;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

// Shared Claude API client for every service that previously called a local
// Ollama model. One thin wrapper around POST /v1/messages so job-tracker and
// finance-tracker don't each re-implement request/response plumbing.
@Service
@RequiredArgsConstructor
public class ClaudeService {

  @Value("${claude.model}")
  private String model;

  private final RestClient claudeRestClient;

  // Sends a single-turn user prompt and returns the concatenated text of the
  // response's content blocks. Callers that need structured data should
  // instruct the model (in the prompt) to respond with ONLY a JSON object of
  // a given shape, then parse the returned string themselves - same pattern
  // the previous Ollama integration used.
  public String complete(String prompt) {
    return complete(prompt, 4096);
  }

  public String complete(String prompt, int maxTokens) {
    ClaudeMessageRequest request =
        new ClaudeMessageRequest(model, maxTokens, List.of(new ClaudeMessage("user", prompt)), null);

    ClaudeMessageResponse response =
        claudeRestClient
            .post()
            .uri("/v1/messages")
            .body(request)
            .retrieve()
            .body(ClaudeMessageResponse.class);

    return response.content().stream()
        .filter(block -> "text".equals(block.type()))
        .map(ClaudeContentBlock::text)
        .reduce("", String::concat);
  }
}
