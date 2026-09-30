package com.lifeos.core.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.core.config.AnthropicProperties;
import com.lifeos.core.config.EmailHubProperties;
import com.lifeos.core.config.OllamaProperties;
import com.lifeos.core.domains.record.EmailClassification;
import com.lifeos.core.exception.AiUnavailableException;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Reads one email and says what it is. Ollama first, like every other AI feature here; Claude only
 * when {@code email-hub.claude-fallback} is switched on - see {@link EmailHubProperties} for why.
 * When no provider is available this throws {@link AiUnavailableException} and the caller leaves the
 * email unrecorded, so the next poll simply tries it again.
 *
 * <p>Response bodies are read as strings and parsed with a plain Jackson 2 mapper for the same
 * reason as {@link QuickCaptureAiClient}: Spring Boot 4's converters speak Jackson 3.
 */
@Component
public class EmailHubAiClient {

  private static final Logger log = LoggerFactory.getLogger(EmailHubAiClient.class);
  private static final int MAX_BODY_CHARS = 4000;

  private static final String SYSTEM_PROMPT =
      """
      You read one email for a personal life-organizer app and decide whether it needs any action.
      Reply with ONLY a JSON object - no prose, no markdown fence.

      Today is %s. Times in the email are in the user's own time zone (%s) unless stated.

      Shape:
      {"category": "TASK" | "BILL" | "EVENT" | "SUBSCRIPTION" | "IGNORE",
       "confidence": "HIGH" | "MEDIUM" | "LOW",
       "summary": string (one plain sentence, under 120 characters, saying what this email is),
       "task": {"title": string, "dueDate": "YYYY-MM-DD" | null, "dueTime": "HH:mm" | null,
                "priority": "URGENT" | "HIGH" | "MEDIUM" | "LOW", "notes": string | null} | null,
       "bill": {"payee": string, "amount": number | null, "currency": string | null,
                "dueDate": "YYYY-MM-DD" | null} | null,
       "event": {"title": string, "start": "YYYY-MM-DDTHH:mm" | null, "end": "YYYY-MM-DDTHH:mm" | null,
                 "startDate": "YYYY-MM-DD" | null, "endDate": "YYYY-MM-DD" | null,
                 "allDay": boolean, "location": string | null, "notes": string | null} | null,
       "subscription": {"name": string, "amount": number, "currency": string | null,
                        "billingCycle": "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY",
                        "nextBillingDate": "YYYY-MM-DD" | null} | null}

      Only the block matching "category" is filled in; the others are null.

      TASK: the sender asks the user to DO something (submit a form, reply, sign, renew, confirm,
        upload, attend a deadline). Not "FYI" mail. Put the deadline in dueDate if the email gives one.
      BILL: an invoice, statement or payment reminder with an amount or due date the user must pay.
        A receipt for something ALREADY paid is not a bill.
      EVENT: an appointment, meeting, interview, class, flight, hotel or reservation with a specific
        date. Use start/end for timed events, or startDate/endDate with allDay true for whole days.
      SUBSCRIPTION: a receipt, renewal notice or trial-ending notice for a recurring service
        (streaming, software, cloud, membership). nextBillingDate is when it charges next.
      IGNORE: newsletters, marketing, social notifications, order-shipped notices, security alerts,
        OTPs, chit-chat, anything needing no action. When in doubt, IGNORE.

      Never invent a date or amount that is not in the email; use null. Use HIGH only when the
      email states the details plainly; MEDIUM when you had to infer something; LOW when guessing.
      """;

  private final OllamaProperties ollamaProperties;
  private final AnthropicProperties anthropicProperties;
  private final EmailHubProperties hubProperties;
  private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
  private final RestClient ollamaRestClient;
  private final RestClient claudeRestClient;

  public EmailHubAiClient(
      OllamaProperties ollamaProperties,
      AnthropicProperties anthropicProperties,
      EmailHubProperties hubProperties,
      @Qualifier("aiRestClientBuilder") RestClient.Builder aiRestClientBuilder) {
    this.ollamaProperties = ollamaProperties;
    this.anthropicProperties = anthropicProperties;
    this.hubProperties = hubProperties;
    this.ollamaRestClient = aiRestClientBuilder.clone().baseUrl(ollamaProperties.baseUrl()).build();
    this.claudeRestClient = aiRestClientBuilder.clone().baseUrl(anthropicProperties.baseUrl()).build();
  }

  public EmailClassification classify(String from, String subject, String body) {
    String system = SYSTEM_PROMPT.formatted(LocalDate.now(ZoneId.of(hubProperties.zoneOrDefault())), hubProperties.zoneOrDefault());
    String user = "FROM: " + nullToEmpty(from) + "\nSUBJECT: " + nullToEmpty(subject) + "\nBODY:\n" + clip(body);

    try {
      return viaOllama(system, user);
    } catch (AiUnavailableException ollamaFailure) {
      if (!hubProperties.claudeFallbackEnabled()) {
        throw ollamaFailure;
      }
      log.info("Local model unavailable for email classification, falling back to Claude");
      return viaClaude(system, user);
    }
  }

  private EmailClassification viaOllama(String system, String user) {
    if (!ollamaProperties.configured()) {
      throw new AiUnavailableException("Ollama is not enabled");
    }
    Map<String, Object> body =
        Map.of(
            "model", ollamaProperties.model(),
            "stream", false,
            "format", "json",
            "options", Map.of("temperature", 0.1),
            "messages", List.of(Map.of("role", "system", "content", system), Map.of("role", "user", "content", user)));
    try {
      String raw = ollamaRestClient.post().uri("/api/chat").body(body).retrieve().body(String.class);
      JsonNode response = raw == null ? null : objectMapper.readTree(raw);
      return parse(response == null ? null : response.path("message").path("content").asText(null), "Ollama");
    } catch (RestClientException exception) {
      throw new AiUnavailableException("Ollama call failed: " + exception.getMessage(), exception);
    } catch (AiUnavailableException exception) {
      throw exception;
    } catch (Exception exception) {
      throw new AiUnavailableException("Could not read Ollama response: " + exception.getMessage(), exception);
    }
  }

  private EmailClassification viaClaude(String system, String user) {
    if (!anthropicProperties.configured()) {
      throw new AiUnavailableException("Claude is not configured (no ANTHROPIC_API_KEY)");
    }
    Map<String, Object> body =
        Map.of(
            "model", anthropicProperties.model(),
            "max_tokens", 700,
            "system", system,
            "messages", List.of(Map.of("role", "user", "content", user)));
    try {
      String raw =
          claudeRestClient
              .post()
              .uri("/v1/messages")
              .header("x-api-key", anthropicProperties.apiKey())
              .header("anthropic-version", anthropicProperties.version())
              .header("content-type", "application/json")
              .body(body)
              .retrieve()
              .body(String.class);
      JsonNode response = raw == null ? null : objectMapper.readTree(raw);
      String content =
          response == null || !response.has("content") || response.get("content").isEmpty()
              ? null
              : response.get("content").get(0).path("text").asText(null);
      return parse(content, "Claude");
    } catch (RestClientException exception) {
      throw new AiUnavailableException("Claude call failed: " + exception.getMessage(), exception);
    } catch (AiUnavailableException exception) {
      throw exception;
    } catch (Exception exception) {
      throw new AiUnavailableException("Could not read Claude response: " + exception.getMessage(), exception);
    }
  }

  EmailClassification parse(String content, String provider) {
    if (content == null || content.isBlank()) {
      throw new AiUnavailableException(provider + " returned an empty response");
    }
    String json = content.strip();
    int start = json.indexOf('{');
    int end = json.lastIndexOf('}');
    if (start >= 0 && end > start) {
      json = json.substring(start, end + 1);
    }
    try {
      return objectMapper.readValue(json, EmailClassification.class);
    } catch (Exception exception) {
      throw new AiUnavailableException("Could not parse classification from " + provider + ": " + exception.getMessage(), exception);
    }
  }

  private static String clip(String body) {
    if (body == null) return "";
    String text = body.strip();
    return text.length() > MAX_BODY_CHARS ? text.substring(0, MAX_BODY_CHARS) : text;
  }

  private static String nullToEmpty(String value) {
    return value == null ? "" : value;
  }
}
