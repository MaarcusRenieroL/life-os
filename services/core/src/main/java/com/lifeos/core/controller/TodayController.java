package com.lifeos.core.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.common.domains.dto.response.TodayItemResponse;
import com.lifeos.core.service.TodayService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/core/today")
@RequiredArgsConstructor
public class TodayController {

  private final TodayService todayService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<TodayItemResponse>>> get(Authentication authentication) {
    UUID userId = (UUID) authentication.getPrincipal();

    return ResponseEntity.ok(ApiResponse.success(todayService.get(userId), "Today fetched successfully"));
  }
}
