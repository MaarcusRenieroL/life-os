package com.lifeos.finance_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.finance_tracker.domains.dto.request.CategorizeTransactionRequest;
import com.lifeos.finance_tracker.domains.dto.request.CreateTransactionRequest;
import com.lifeos.finance_tracker.domains.dto.request.DisputeTransactionRequest;
import com.lifeos.finance_tracker.domains.dto.request.MergeTransactionsRequest;
import com.lifeos.finance_tracker.domains.dto.request.RenameTransactionRequest;
import com.lifeos.finance_tracker.domains.dto.request.UpdateTransactionCategoriesRequest;
import com.lifeos.finance_tracker.domains.dto.request.UpdateTransactionRequest;
import com.lifeos.finance_tracker.domains.dto.response.TransactionResponse;
import com.lifeos.finance_tracker.domains.enums.SourceType;
import com.lifeos.finance_tracker.domains.record.PageResponse;
import com.lifeos.finance_tracker.service.TransactionService;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/finance/transactions")
@RequiredArgsConstructor
public class TransactionController {

  private final TransactionService transactionService;

  @GetMapping
  public ResponseEntity<ApiResponse<PageResponse<TransactionResponse>>> getTransactions(
      Authentication authentication,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "50") int size,
      @RequestParam(required = false) String search,
      @RequestParam(required = false) String status,
      @RequestParam(required = false) UUID categoryId,
      @RequestParam(required = false) SourceType sourceType) {
    return ResponseEntity.ok(
        ApiResponse.success(
            transactionService.getAllPaginated(
                authentication, page, size, search, status, categoryId, sourceType),
            "Transactions fetched successfully"));
  }

  @GetMapping("/{id}")
  public ResponseEntity<ApiResponse<TransactionResponse>> getTransaction(
      Authentication authentication, @PathVariable UUID id) {
    return ResponseEntity.ok(
        ApiResponse.success(
            transactionService.get(authentication, id), "Transaction fetched successfully"));
  }

  @PostMapping
  public ResponseEntity<ApiResponse<TransactionResponse>> createTransaction(
      Authentication authentication, @Valid @RequestBody CreateTransactionRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            transactionService.save(authentication, request), "Transaction created successfully"));
  }

  @PutMapping("/{id}")
  public ResponseEntity<ApiResponse<TransactionResponse>> updateTransaction(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody UpdateTransactionRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            transactionService.update(authentication, id, request),
            "Transaction updated successfully"));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<ApiResponse<Void>> deleteTransaction(
      Authentication authentication, @PathVariable UUID id) {
    transactionService.delete(authentication, id);

    return ResponseEntity.ok(ApiResponse.success(null, "Transaction deleted successfully"));
  }

  @PutMapping("/{id}/categorize")
  public ResponseEntity<ApiResponse<TransactionResponse>> categorizeTransaction(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody CategorizeTransactionRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            transactionService.categorize(authentication, id, request),
            "Transaction categorized successfully"));
  }

  @PutMapping("/{id}/rename")
  public ResponseEntity<ApiResponse<TransactionResponse>> renameTransaction(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody RenameTransactionRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            transactionService.renameTransaction(authentication, id, request),
            "Transaction renamed successfully"));
  }

  @PutMapping("/{id}/merge")
  public ResponseEntity<ApiResponse<TransactionResponse>> mergeTransactions(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody MergeTransactionsRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            transactionService.merge(authentication, id, request),
            "Transactions merged successfully"));
  }

  @PutMapping("/{id}/dispute")
  public ResponseEntity<ApiResponse<TransactionResponse>> disputeTransaction(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody DisputeTransactionRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            transactionService.dispute(authentication, id, request), "Dispute saved successfully"));
  }

  @PutMapping("/{id}/categories")
  public ResponseEntity<ApiResponse<TransactionResponse>> updateTransactionCategories(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody UpdateTransactionCategoriesRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            transactionService.updateCategories(authentication, id, request),
            "Transaction categories updated successfully"));
  }
}
