package com.lifeos.habit_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.common.domains.dto.response.TodayItemResponse;
import com.lifeos.habit_tracker.service.InternalTodayService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

// Called by core's cross-module Today aggregation via the internal API key, not by end users -
// see SecurityConfig's INTERNAL_SERVICE matcher for this prefix. userId is passed as a request
// param (rather than read off an Authentication principal) since internal calls carry no JWT,
// same convention as finance-tracker's InternalTransactionController family.
@RestController
@RequestMapping("/v1/habits/internal")
@RequiredArgsConstructor
public class InternalTodayController {

  private final InternalTodayService internalTodayService;

  @GetMapping("/today")
  public ResponseEntity<ApiResponse<List<TodayItemResponse>>> today(@RequestParam UUID userId) {
    return ResponseEntity.ok(
        ApiResponse.success(internalTodayService.today(userId), "Today items fetched successfully"));
  }
}
