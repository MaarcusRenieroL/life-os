package com.lifeos.batches.config;

import com.lifeos.batches.domains.record.RawEmail;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
@RequiredArgsConstructor
public class JobTrackerClient {

  private final RestClient jobTrackerRestClient;

  @Value("${internal.api-key}")
  private String internalApiKey;

  /** Shape matches job-tracker's {@code IngestEmailRequest} - see POST /v1/jobs/internal/emails/ingest. */
  public void ingestEmail(UUID userId, RawEmail email) {
    Map<String, Object> request =
        Map.of(
            "userId", userId.toString(),
            "externalMessageId", email.messageId(),
            "threadId", email.threadId() == null ? "" : email.threadId(),
            "fromAddress", email.fromAddress() == null ? "" : email.fromAddress(),
            "toAddress", email.toAddress() == null ? "" : email.toAddress(),
            "subject", email.subject() == null ? "" : email.subject(),
            "body", email.body() == null ? "" : email.body(),
            "receivedAt", email.receivedAt() == null ? Instant.now().toString() : email.receivedAt().toString());

    jobTrackerRestClient
        .post()
        .uri("/v1/jobs/internal/emails/ingest")
        .header("X-Internal-Api-Key", internalApiKey)
        .body(request)
        .retrieve()
        .toBodilessEntity();
  }
}
