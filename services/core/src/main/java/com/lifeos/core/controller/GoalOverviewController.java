package com.lifeos.core.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.core.domains.dto.response.GoalOverviewResponse;
import com.lifeos.core.service.GoalOverviewService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/core/goals")
@RequiredArgsConstructor
public class GoalOverviewController {

  private final GoalOverviewService goalOverviewService;

  @GetMapping("/overview")
  public ResponseEntity<ApiResponse<List<GoalOverviewResponse>>> overview(Authentication authentication) {
    UUID userId = (UUID) authentication.getPrincipal();
    return ResponseEntity.ok(ApiResponse.success(goalOverviewService.get(userId), "Goal overview fetched successfully"));
  }
}
