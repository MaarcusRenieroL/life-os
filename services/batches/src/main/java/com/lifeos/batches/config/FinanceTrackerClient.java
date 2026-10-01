package com.lifeos.batches.config;

import com.lifeos.batches.domains.dto.request.CreateCsvImportTransactionBatchRequest;
import com.lifeos.batches.domains.dto.request.CreateCsvImportTransactionRequest;
import com.lifeos.batches.domains.record.StatementImportResult;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;

@Component
@RequiredArgsConstructor
public class FinanceTrackerClient {

  private final RestClient financeTrackerRestClient;

  @Value("${internal.api-key}")
  private String internalApiKey;

  public void createCsvImportTransaction(CreateCsvImportTransactionRequest request) {
    financeTrackerRestClient
        .post()
        .uri("/v1/finance/internal/transactions/csv-import")
        .header("X-Internal-Api-Key", internalApiKey)
        .body(request)
        .retrieve()
        .toBodilessEntity();
  }

  /** Imports a whole parsed statement in one HTTP call instead of one per row - see
   * StatementImportService, which used to loop over {@link #createCsvImportTransaction}. */
  public StatementImportResult createCsvImportTransactionsBatch(
      List<CreateCsvImportTransactionRequest> transactions) {
    JsonNode response =
        financeTrackerRestClient
            .post()
            .uri("/v1/finance/internal/transactions/csv-import/batch")
            .header("X-Internal-Api-Key", internalApiKey)
            .body(CreateCsvImportTransactionBatchRequest.builder().transactions(transactions).build())
            .retrieve()
            .body(JsonNode.class);

    JsonNode data = response.get("data");
    return new StatementImportResult(data.get("totalRows").asInt(), data.get("imported").asInt());
  }

  /**
   * Tells finance about an alert email that could not be turned into a transaction, so it shows up
   * in the Finance import inbox instead of vanishing into a log line. Best effort: reporting a
   * failure must never fail the sync that found it.
   */
  public void reportImportFailure(
      java.util.UUID userId, String reference, String sender, String subject, String snippet, String detail) {
    try {
      java.util.Map<String, Object> body = new java.util.HashMap<>();
      body.put("userId", userId);
      body.put("reference", reference);
      body.put("sender", sender);
      body.put("subject", subject);
      body.put("snippet", snippet);
      body.put("detail", detail);
      financeTrackerRestClient
          .post()
          .uri("/v1/finance/internal/import-failures")
          .header("X-Internal-Api-Key", internalApiKey)
          .body(body)
          .retrieve()
          .toBodilessEntity();
    } catch (RuntimeException exception) {
      org.slf4j.LoggerFactory.getLogger(FinanceTrackerClient.class)
          .warn("Could not report import failure {}: {}", reference, exception.getMessage());
    }
  }
}
