package com.lifeos.finance_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.common.domains.dto.response.TodayItemResponse;
import com.lifeos.finance_tracker.domains.dto.request.CreateQuickCaptureTransactionRequest;
import com.lifeos.finance_tracker.domains.dto.response.TransactionResponse;
import com.lifeos.finance_tracker.service.FinanceTodayService;
import com.lifeos.finance_tracker.service.TransactionService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

// Called by core's TodayService and quick-capture flow via the internal API key, not by end
// users - see InternalTransactionController and SecurityConfig's INTERNAL_SERVICE matcher for
// this prefix. No JWT context is available on this path, so the caller (core) passes userId
// explicitly.
@RestController
@RequestMapping("/v1/finance/internal")
@RequiredArgsConstructor
public class InternalTodayController {

  private final FinanceTodayService financeTodayService;
  private final TransactionService transactionService;

  @GetMapping("/today")
  public ResponseEntity<ApiResponse<List<TodayItemResponse>>> today(@RequestParam UUID userId) {
    return ResponseEntity.ok(ApiResponse.success(financeTodayService.getToday(userId), "Today items fetched"));
  }

  /** Backs core's quick-capture flow - core's AI classifier turns a free-text line like "spent
   * 400 on groceries" into {description, amount, type} and calls this with an explicit userId
   * (no JWT context on internal calls). See {@link TransactionService#createFromQuickCapture}
   * for how the transaction's account is resolved and how it's run through the same
   * categorization/merchant/budget pipeline as any other transaction. */
  @PostMapping("/quick-transaction")
  public ResponseEntity<ApiResponse<TransactionResponse>> quickTransaction(
      @Valid @RequestBody CreateQuickCaptureTransactionRequest request) {
    TransactionResponse transaction = transactionService.createFromQuickCapture(request);

    return ResponseEntity.ok(ApiResponse.success(transaction, "Transaction captured successfully"));
  }
}
