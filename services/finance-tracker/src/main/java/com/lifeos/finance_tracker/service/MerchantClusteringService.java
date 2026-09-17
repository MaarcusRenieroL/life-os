package com.lifeos.finance_tracker.service;

import com.lifeos.finance_tracker.domains.record.OllamaGenerateRequest;
import com.lifeos.finance_tracker.domains.record.OllamaGenerateResponse;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
public class MerchantClusteringService {

  @Value("${ollama.model}")
  private String ollamaModel;

  // Not used yet - Claude fallback isn't implemented, only the local Ollama
  // path exists right now. Wire this in when adding the fallback tier.
  @Value("${anthropic.api-key}")
  private String anthropicApiKey;

  private final RestClient ollamaRestClient;
  private final ObjectMapper objectMapper;

  public Map<String, String> clusterDescriptions(List<String> distinctDescriptions) {
    String prompt =
        "Here is a list of bank transaction descriptions. Group descriptions that refer to the same"
            + " merchant/subscription together, even if formatted slightly differently. Return a"
            + " JSON object mapping each original description to a short normalized merchant name."
            + " Descriptions: "
            + objectMapper.writeValueAsString(distinctDescriptions);

    OllamaGenerateRequest request = new OllamaGenerateRequest(ollamaModel, prompt, false, "json");

    OllamaGenerateResponse response =
        ollamaRestClient
            .post()
            .uri("/api/generate")
            .body(request)
            .retrieve()
            .body(OllamaGenerateResponse.class);

    return objectMapper.readValue(response.response(), new TypeReference<Map<String, String>>() {});
  }
}
