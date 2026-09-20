package com.lifeos.finance_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.common.domains.dto.response.TodayItemResponse;
import com.lifeos.finance_tracker.service.FinanceTodayService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

// Called by core's TodayService via the internal API key, not by end users - see
// InternalTransactionController and SecurityConfig's INTERNAL_SERVICE matcher for this prefix.
// No JWT context is available on this path, so the caller (core) passes userId explicitly.
@RestController
@RequestMapping("/v1/finance/internal")
@RequiredArgsConstructor
public class InternalTodayController {

  private final FinanceTodayService financeTodayService;

  @GetMapping("/today")
  public ResponseEntity<ApiResponse<List<TodayItemResponse>>> today(@RequestParam UUID userId) {
    return ResponseEntity.ok(ApiResponse.success(financeTodayService.getToday(userId), "Today items fetched"));
  }
}
