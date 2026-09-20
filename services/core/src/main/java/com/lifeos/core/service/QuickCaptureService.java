package com.lifeos.core.service;

import com.lifeos.core.domains.record.QuickCaptureClassification;
import com.lifeos.core.domains.record.QuickCaptureResult;
import com.lifeos.core.exception.AiUnavailableException;
import com.lifeos.core.exception.QuickCaptureRoutingException;
import com.lifeos.core.integration.QuickCaptureAiClient;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.function.Supplier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

/** The frictionless-capture flow: one line of free text in, routed to whichever module it
 * actually belongs to. Ollama classifies first; a failure there returns "needs_ai_approval"
 * instead of silently spending on Claude - see QuickCaptureAiClient's class doc for why. */
@Service
public class QuickCaptureService {

  private final QuickCaptureAiClient aiClient;
  private final RestClient financeTrackerRestClient;
  private final RestClient jobTrackerRestClient;
  private final RestClient notesRestClient;
  private final String internalApiKey;

  public QuickCaptureService(
      QuickCaptureAiClient aiClient,
      RestClient financeTrackerRestClient,
      RestClient jobTrackerRestClient,
      RestClient notesRestClient,
      @Value("${internal.api-key}") String internalApiKey) {
    this.aiClient = aiClient;
    this.financeTrackerRestClient = financeTrackerRestClient;
    this.jobTrackerRestClient = jobTrackerRestClient;
    this.notesRestClient = notesRestClient;
    this.internalApiKey = internalApiKey;
  }

  public QuickCaptureResult capture(UUID userId, String text, boolean useClaudeFallback) {
    QuickCaptureClassification classification;

    try {
      classification = aiClient.classifyWithOllama(text);
    } catch (AiUnavailableException ollamaFailure) {
      if (!useClaudeFallback) {
        return new QuickCaptureResult("needs_ai_approval", null, null);
      }
      // Let a Claude failure here propagate as a real error (both providers down is a genuine
      // failure, not a "needs approval" state - the user already approved spending on Claude).
      classification = aiClient.classifyWithClaude(text);
    }

    return route(userId, text, classification);
  }

  private QuickCaptureResult route(UUID userId, String rawText, QuickCaptureClassification classification) {
    return switch (classification.module()) {
      case "finance" -> routeFinance(userId, classification.finance());
      case "job" -> routeJob(userId, classification.job());
      default -> routeNote(userId, rawText, classification.note());
    };
  }

  private QuickCaptureResult routeFinance(UUID userId, QuickCaptureClassification.FinanceCapture capture) {
    if (capture == null || capture.description() == null || capture.amount() == null || capture.type() == null) {
      throw new QuickCaptureRoutingException("Couldn't extract a clear amount and description from that");
    }

    Map<String, Object> request = new HashMap<>();
    request.put("userId", userId.toString());
    request.put("description", capture.description());
    request.put("amount", capture.amount());
    request.put("type", capture.type());

    callDownstream(
        () ->
            financeTrackerRestClient
                .post()
                .uri("/v1/finance/internal/quick-transaction")
                .header("X-Internal-Api-Key", internalApiKey)
                .body(request)
                .retrieve()
                .toBodilessEntity());

    return new QuickCaptureResult(
        "created", "finance", capture.description() + " (" + capture.amount() + ")");
  }

  private QuickCaptureResult routeJob(UUID userId, QuickCaptureClassification.JobCapture capture) {
    if (capture == null || (isBlank(capture.company()) && isBlank(capture.title()))) {
      throw new QuickCaptureRoutingException("Couldn't extract a company or title from that");
    }

    Map<String, Object> request =
        Map.of("userId", userId.toString(), "company", nullToEmpty(capture.company()), "title", nullToEmpty(capture.title()));

    callDownstream(
        () ->
            jobTrackerRestClient
                .post()
                .uri("/v1/jobs/internal/quick-job")
                .header("X-Internal-Api-Key", internalApiKey)
                .body(request)
                .retrieve()
                .toBodilessEntity());

    return new QuickCaptureResult("created", "job", capture.title() + " at " + capture.company());
  }

  private QuickCaptureResult routeNote(
      UUID userId, String rawText, QuickCaptureClassification.NoteCapture capture) {
    // Classification failing to populate "note" (a null branch despite module="note") would be
    // an AI-response contract violation, not a user error - fall back to the raw text itself
    // rather than losing the capture entirely.
    String title = capture != null ? capture.title() : rawText.length() > 60 ? rawText.substring(0, 60) : rawText;
    String body = capture != null ? capture.body() : rawText;

    Map<String, String> request = Map.of("userId", userId.toString(), "title", title, "body", body);

    callDownstream(
        () ->
            notesRestClient
                .post()
                .uri("/v1/notes/internal/quick-note")
                .header("X-Internal-Api-Key", internalApiKey)
                .body(request)
                .retrieve()
                .toBodilessEntity());

    return new QuickCaptureResult("created", "note", title);
  }

  /** The downstream module rejecting the request (e.g. finance-tracker has no account to
   * attach a transaction to) is a real, expected failure, not a bug - surface its message
   * cleanly instead of letting a raw RestClientResponseException become an unhandled 500. */
  private void callDownstream(Supplier<?> call) {
    try {
      call.get();
    } catch (RestClientResponseException exception) {
      throw new QuickCaptureRoutingException(
          exception.getResponseBodyAs(Map.class) instanceof Map<?, ?> body && body.get("message") != null
              ? String.valueOf(body.get("message"))
              : "Could not save that: " + exception.getStatusText());
    }
  }

  private static boolean isBlank(String value) {
    return value == null || value.isBlank();
  }

  private static String nullToEmpty(String value) {
    return value == null ? "" : value;
  }
}
