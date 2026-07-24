package com.lifeos.batches.config;

import tools.jackson.databind.JsonNode;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
@RequiredArgsConstructor
public class VaultBackupClient {

  private final RestClient vaultRestClient;

  @Value("${internal.api-key}")
  private String internalApiKey;

  public String fetchSnapshot(UUID userId) {
    JsonNode response =
        vaultRestClient
            .get()
            .uri("/v1/vault/internal/backup-snapshot/{userId}", userId)
            .header("X-Internal-Api-Key", internalApiKey)
            .retrieve()
            .body(JsonNode.class);

    return response.get("data").toString();
  }

  public void restoreSnapshot(UUID userId, String snapshot) {
    vaultRestClient
        .post()
        .uri("/v1/vault/internal/backup-restore/{userId}", userId)
        .header("X-Internal-Api-Key", internalApiKey)
        .header("Content-Type", "application/json")
        .body(snapshot)
        .retrieve()
        .toBodilessEntity();
  }
}
