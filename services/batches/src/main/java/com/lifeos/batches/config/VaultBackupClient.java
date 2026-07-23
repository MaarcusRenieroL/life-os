package com.lifeos.batches.config;

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
    return vaultRestClient
        .get()
        .uri("/v1/vault/internal/backup-snapshot/{userId}", userId)
        .header("X-Internal-Api-Key", internalApiKey)
        .retrieve()
        .body(String.class);
  }
}
