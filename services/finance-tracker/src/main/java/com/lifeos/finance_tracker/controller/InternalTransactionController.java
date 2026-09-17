package com.lifeos.finance_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.finance_tracker.domains.dto.request.CreateCsvImportTransactionRequest;
import com.lifeos.finance_tracker.domains.dto.request.CreateEmailAlertTransactionRequest;
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
@RestController
@RequestMapping("/v1/finance/internal")
@RequiredArgsConstructor
public class InternalTransactionController {

  private final TransactionService transactionService;

  @PostMapping("/transactions")
  public ResponseEntity<ApiResponse<Void>> createEmailAlertTransaction(
      @Valid @RequestBody CreateEmailAlertTransactionRequest request) {
    transactionService.createFromEmailAlert(request);

    return ResponseEntity.ok(ApiResponse.success(null, "Transaction processed successfully"));
  }

  @PostMapping("/transactions/csv-import")
  public ResponseEntity<ApiResponse<Void>> createCsvImportTransaction(
      @Valid @RequestBody CreateCsvImportTransactionRequest request) {
    transactionService.createFromCsvImport(request);

    return ResponseEntity.ok(ApiResponse.success(null, "Transaction processed successfully"));
  }
}
