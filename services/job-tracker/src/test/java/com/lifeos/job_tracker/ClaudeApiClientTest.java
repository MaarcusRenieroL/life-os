package com.lifeos.job_tracker;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.job_tracker.config.AnthropicProperties;
import com.lifeos.job_tracker.exception.ClaudeUnavailableException;
import com.lifeos.job_tracker.integration.ClaudeApiClient;
import org.junit.jupiter.api.Test;

class ClaudeApiClientTest {

  @Test
  void callFailsFastWhenApiKeyMissing() {
    ClaudeApiClient client =
        new ClaudeApiClient(
            new AnthropicProperties("https://api.anthropic.com", "", "claude-sonnet-4-6", "2023-06-01", 1024),
            new ObjectMapper());

    assertThat(client.isConfigured()).isFalse();
    assertThatThrownBy(() -> client.complete("sys", "user"))
        .isInstanceOf(ClaudeUnavailableException.class)
        .hasMessageContaining("not configured");
  }
}
