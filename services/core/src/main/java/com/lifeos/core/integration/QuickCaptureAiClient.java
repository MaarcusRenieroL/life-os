package com.lifeos.core.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.core.config.AnthropicProperties;
import com.lifeos.core.config.OllamaProperties;
import com.lifeos.core.domains.record.QuickCaptureClassification;
import com.lifeos.core.exception.AiUnavailableException;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/** Classifies free-text quick-capture input into a module + structured fields. Ollama is tried
 * first (free, local) per this codebase's established AI-routing convention (see job-tracker's
 * ai.routing.* keys); Claude is only ever called when the caller explicitly asks for it
 * (QuickCaptureService's contract: a failed Ollama attempt returns a "needs approval" result
 * instead of silently falling back, so the frontend can show the same
 * "use Claude instead? this costs money" dialog the notification bell uses for background
 * failures - here it's synchronous since the user is actively waiting).
 *
 * <p>Bodies are read as {@code String.class} and parsed with our own ObjectMapper rather than
 * requesting {@code JsonNode} directly - a bare {@code RestClient.builder()} has no Jackson
 * converter wired for JsonNode in this Spring Boot 4 setup (same issue job-tracker's
 * ClaudeApiClient already works around, and the same root cause - a missing no-args constructor
 * on the target type - that broke core's own ApiResponse deserialization until that was fixed). */
@Component
public class QuickCaptureAiClient {

  private static final Logger log = LoggerFactory.getLogger(QuickCaptureAiClient.class);

  private static final String SYSTEM_PROMPT_TEMPLATE =
      """
      You are a quick-capture classifier for a personal life-organizer app. Given one short
      piece of free text the user typed, decide which of four things they meant and extract
      structured fields. Today is %s (%s), the user's timezone is Asia/Kolkata. Respond with ONLY
      a JSON object, no prose, no markdown fence, matching exactly this shape:

      {"module": "finance" | "job" | "task" | "note",
       "finance": {"description": string, "amount": number, "type": "DEBIT" | "CREDIT"} | null,
       "job": {"company": string, "title": string} | null,
       "task": {"title": string, "dueDate": "yyyy-MM-dd" | null, "dueTime": "HH:mm" | null,
                "priority": "URGENT" | "HIGH" | "MEDIUM" | "LOW"} | null,
       "note": {"title": string, "body": string} | null}

      Only the field matching "module" should be non-null; all the others must be null.

      Use "finance" when the text describes spending or receiving money (e.g. "spent 400 on
      groceries", "got paid 50000 salary") - type is DEBIT for money spent, CREDIT for money
      received, amount is the number with no currency symbol.

      Use "job" when the text describes applying to or hearing about a job (e.g. "applied to
      Stripe for backend engineer") - company and title are your best extraction.

      Use "task" for anything the user has to do or show up for, with or without a deadline or a
      time: chores, deadlines, appointments, meetings, calls (e.g. "renew the passport", "call the
      bank tomorrow", "submit report by friday", "dentist monday at 5pm"). title is a short action
      phrase. Work out dueDate from words like tomorrow, friday, next week, the 15th using today's
      date; leave it null when none is said. priority is MEDIUM unless the text says it is urgent
      or important (HIGH/URGENT) or low priority (LOW).

      Use "note" for everything else - ideas, facts to remember, anything that is not clearly one
      of the above. This is the safe default, never leave the input uncaptured. title is a short
      (under 60 char) summary you write, body is the original text.
      """;

  private static String systemPrompt() {
    java.time.LocalDate today = java.time.LocalDate.now(java.time.ZoneId.of("Asia/Kolkata"));
    return SYSTEM_PROMPT_TEMPLATE.formatted(
        today, today.getDayOfWeek().getDisplayName(java.time.format.TextStyle.FULL, java.util.Locale.ENGLISH));
  }

  private final OllamaProperties ollamaProperties;
  private final AnthropicProperties anthropicProperties;
  private final ObjectMapper objectMapper;
  private final RestClient ollamaRestClient;
  private final RestClient claudeRestClient;

  // spring-boot-starter-webmvc (unlike spring-boot-starter-web) doesn't autoconfigure an
  // ObjectMapper bean - same gotcha already documented on core's CacheConfig. Build our own
  // rather than depending on injection that isn't there.
  public QuickCaptureAiClient(
      OllamaProperties ollamaProperties,
      AnthropicProperties anthropicProperties,
      @Qualifier("aiRestClientBuilder") RestClient.Builder aiRestClientBuilder) {
    this.ollamaProperties = ollamaProperties;
    this.anthropicProperties = anthropicProperties;
    this.objectMapper = new ObjectMapper().findAndRegisterModules();
    this.ollamaRestClient = aiRestClientBuilder.clone().baseUrl(ollamaProperties.baseUrl()).build();
    this.claudeRestClient =
        aiRestClientBuilder.clone().baseUrl(anthropicProperties.baseUrl()).build();
  }

  public QuickCaptureClassification classifyWithOllama(String text) {
    if (!ollamaProperties.configured()) {
      throw new AiUnavailableException("Ollama is not enabled");
    }

    Map<String, Object> body =
        Map.of(
            "model", ollamaProperties.model(),
            "stream", false,
            "format", "json",
            "messages",
                List.of(
                    Map.of("role", "system", "content", systemPrompt()),
                    Map.of("role", "user", "content", text)));

    try {
      String raw = ollamaRestClient.post().uri("/api/chat").body(body).retrieve().body(String.class);
      JsonNode response = raw == null ? null : objectMapper.readTree(raw);
      String content = response == null ? null : response.path("message").path("content").asText(null);

      return parse(content, "Ollama");
    } catch (RestClientException exception) {
      log.warn("Ollama quick-capture classification failed: {}", exception.getMessage());
      throw new AiUnavailableException("Ollama call failed: " + exception.getMessage(), exception);
    } catch (Exception exception) {
      throw new AiUnavailableException(
          "Could not read Ollama response: " + exception.getMessage(), exception);
    }
  }

  public QuickCaptureClassification classifyWithClaude(String text) {
    if (!anthropicProperties.configured()) {
      throw new AiUnavailableException("Claude is not configured (no ANTHROPIC_API_KEY)");
    }

    Map<String, Object> body =
        Map.of(
            "model", anthropicProperties.model(),
            "max_tokens", 512,
            "system", systemPrompt(),
            "messages", List.of(Map.of("role", "user", "content", text)));

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
      log.warn("Claude quick-capture classification failed: {}", exception.getMessage());
      throw new AiUnavailableException("Claude call failed: " + exception.getMessage(), exception);
    } catch (Exception exception) {
      throw new AiUnavailableException(
          "Could not read Claude response: " + exception.getMessage(), exception);
    }
  }

  private QuickCaptureClassification parse(String content, String providerName) {
    if (content == null || content.isBlank()) {
      throw new AiUnavailableException(providerName + " returned an empty response");
    }
    try {
      String jsonOnly = content.strip();
      int start = jsonOnly.indexOf('{');
      int end = jsonOnly.lastIndexOf('}');
      if (start >= 0 && end > start) {
        jsonOnly = jsonOnly.substring(start, end + 1);
      }
      return objectMapper.readValue(jsonOnly, QuickCaptureClassification.class);
    } catch (Exception exception) {
      throw new AiUnavailableException(
          "Could not parse classification JSON from " + providerName + ": " + exception.getMessage(),
          exception);
    }
  }
}
