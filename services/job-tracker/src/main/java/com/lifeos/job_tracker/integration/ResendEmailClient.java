package com.lifeos.job_tracker.integration;

import com.lifeos.job_tracker.config.ResendProperties;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Outbound email via Resend. Phase 1 only needs "log the intent" per the spec, so when
 * {@code resend.api-key} is unset this logs and returns without sending. When configured it does a
 * real send.
 */
@Component
@RequiredArgsConstructor
public class ResendEmailClient {

  private static final Logger log = LoggerFactory.getLogger(ResendEmailClient.class);

  private final ResendProperties properties;
  private final RestClient.Builder restClientBuilder;

  public void send(String to, String subject, String body) {
    if (!properties.configured()) {
      log.info("[resend disabled] would email to={} subject={}", to, subject);
      return;
    }

    try {
      restClientBuilder
          .build()
          .post()
          .uri("https://api.resend.com/emails")
          .header("Authorization", "Bearer " + properties.apiKey())
          .body(
              Map.of(
                  "from", properties.from(),
                  "to", List.of(to),
                  "subject", subject,
                  "text", body))
          .retrieve()
          .toBodilessEntity();
    } catch (RestClientException exception) {
      log.warn("Resend send to {} failed: {}", to, exception.getMessage());
    }
  }
}
