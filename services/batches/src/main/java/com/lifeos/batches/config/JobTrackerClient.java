package com.lifeos.batches.config;

import com.lifeos.batches.domains.dto.request.CreateEmailEventRequest;
import com.lifeos.batches.domains.record.RawEmail;
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

  public void createEmailEvent(RawEmail email, UUID ownerUserId) {
    CreateEmailEventRequest request =
        CreateEmailEventRequest.builder()
            .userId(ownerUserId)
            .gmailMessageId(email.messageId())
            .fromAddress(email.fromAddress())
            .subject(email.subject())
            .body(email.body())
            .build();

    jobTrackerRestClient
        .post()
        .uri("/v1/jobs/internal/email-events")
        .header("X-Internal-Api-Key", internalApiKey)
        .body(request)
        .retrieve()
        .toBodilessEntity();
  }
}
