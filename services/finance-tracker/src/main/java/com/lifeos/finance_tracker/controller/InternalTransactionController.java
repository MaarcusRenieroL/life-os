package com.lifeos.finance_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.finance_tracker.domains.dto.request.CreateCsvImportTransactionBatchRequest;
import com.lifeos.finance_tracker.domains.dto.request.CreateCsvImportTransactionRequest;
import com.lifeos.finance_tracker.domains.dto.response.CsvImportBatchResponse;
import com.lifeos.finance_tracker.service.TransactionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Called by batches' scheduled Gmail poller via the internal API key, not by
// end users - see SecurityConfig's INTERNAL_SERVICE matcher for this prefix.
// Bank-alert transactions arrive via Kafka now (see BankAlertEventConsumer), not this
// controller - only the CSV-import paths (still a synchronous user-waiting flow) remain here.
@RestController
@RequestMapping("/v1/finance/internal")
@RequiredArgsConstructor
public class InternalTransactionController {

  private final TransactionService transactionService;

  @PostMapping("/transactions/csv-import")
  public ResponseEntity<ApiResponse<Void>> createCsvImportTransaction(
      @Valid @RequestBody CreateCsvImportTransactionRequest request) {
    transactionService.createFromCsvImport(request);

    return ResponseEntity.ok(ApiResponse.success(null, "Transaction processed successfully"));
  }

  /** Imports every row of a parsed statement in one call - see StatementImportService in
   * batches, which used to call {@link #createCsvImportTransaction} once per row. */
  @PostMapping("/transactions/csv-import/batch")
  public ResponseEntity<ApiResponse<CsvImportBatchResponse>> createCsvImportTransactionBatch(
      @Valid @RequestBody CreateCsvImportTransactionBatchRequest request) {
    CsvImportBatchResponse result = transactionService.createFromCsvImportBatch(request.getTransactions());

    return ResponseEntity.ok(ApiResponse.success(result, "Statement import processed"));
  }
}
