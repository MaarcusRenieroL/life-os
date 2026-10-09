package com.lifeos.core.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.lifeos.core.config.AnthropicProperties;
import com.lifeos.core.config.EmailHubProperties;
import com.lifeos.core.config.OllamaProperties;
import com.lifeos.core.domains.record.EmailClassification;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

/** An Ollama build that cannot do JSON mode answers 501; the client must retry without it, not give up. */
class OllamaJsonModeFallbackTest {

  private static final String REPLY =
      "{\"message\":{\"role\":\"assistant\",\"content\":\"{\\\"category\\\":\\\"IGNORE\\\",\\\"confidence\\\":\\\"HIGH\\\",\\\"summary\\\":\\\"A promo.\\\","
          + "\\\"task\\\":null,\\\"bill\\\":null,\\\"event\\\":null,\\\"subscription\\\":null}\"}}";

  @Test
  void retriesWithoutJsonModeWhenOllamaAnswersNotImplemented() {
    RestClient.Builder builder = RestClient.builder();
    MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    server
        .expect(requestTo("http://ollama.test/api/chat"))
        .andExpect(method(HttpMethod.POST))
        .andExpect(jsonPath("$.format").value("json"))
        .andExpect(jsonPath("$.think").value(false))
        .andRespond(withStatus(HttpStatus.NOT_IMPLEMENTED));
    server
        .expect(requestTo("http://ollama.test/api/chat"))
        .andExpect(jsonPath("$.format").doesNotExist())
        .andExpect(jsonPath("$.think").value(false))
        .andRespond(withSuccess(REPLY, MediaType.APPLICATION_JSON));

    EmailHubAiClient client =
        new EmailHubAiClient(
            new OllamaProperties("http://ollama.test", "qwen3.5:9b", true),
            new AnthropicProperties("http://claude.test", "", "m", "v", 100),
            new EmailHubProperties(false, "Asia/Kolkata", false),
            builder);

    EmailClassification result = client.classify("a@b.c", "50% off", "Buy now");

    assertThat(result.category()).isEqualTo("IGNORE");
    server.verify();
  }
}
