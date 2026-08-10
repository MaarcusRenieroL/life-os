package com.lifeos.finance_tracker.service;

import com.lifeos.common.ai.ClaudeService;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
public class MerchantClusteringService {

  private final ClaudeService claudeService;
  private final ObjectMapper objectMapper;

  public Map<String, String> clusterDescriptions(List<String> distinctDescriptions) {
    String prompt =
        "Here is a list of bank transaction descriptions. Group descriptions that refer to the same"
            + " merchant/subscription together, even if formatted slightly differently. Return"
            + " ONLY a JSON object mapping each original description to a short normalized"
            + " merchant name, no other text."
            + " Descriptions: "
            + objectMapper.writeValueAsString(distinctDescriptions);

    String response = claudeService.complete(prompt);

    return objectMapper.readValue(response, new TypeReference<Map<String, String>>() {});
  }
}
