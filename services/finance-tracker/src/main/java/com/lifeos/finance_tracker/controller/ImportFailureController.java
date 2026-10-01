package com.lifeos.finance_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.finance_tracker.domains.dto.response.ImportFailureResponse;
import com.lifeos.finance_tracker.service.ImportFailureService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Bank alerts and statement rows that could not be booked, waiting for the user. */
@RestController
@RequestMapping("/v1/finance/import-failures")
@RequiredArgsConstructor
public class ImportFailureController {

  private final ImportFailureService importFailureService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<ImportFailureResponse>>> list(Authentication authentication) {
    return ResponseEntity.ok(ApiResponse.success(importFailureService.listOpen(authentication), "Open items fetched"));
  }

  @GetMapping("/count")
  public ResponseEntity<ApiResponse<Long>> count(Authentication authentication) {
    return ResponseEntity.ok(ApiResponse.success(importFailureService.countOpen(authentication), "Open items counted"));
  }

  @PostMapping("/{id}/retry")
  public ResponseEntity<ApiResponse<Void>> retry(Authentication authentication, @PathVariable UUID id) {
    importFailureService.retry(authentication, id);
    return ResponseEntity.ok(ApiResponse.success(null, "Booked"));
  }

  @PostMapping("/{id}/dismiss")
  public ResponseEntity<ApiResponse<Void>> dismiss(Authentication authentication, @PathVariable UUID id) {
    importFailureService.dismiss(authentication, id);
    return ResponseEntity.ok(ApiResponse.success(null, "Dismissed"));
  }
}
