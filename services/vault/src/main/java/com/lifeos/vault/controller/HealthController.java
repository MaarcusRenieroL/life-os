package com.lifeos.vault.controller;

import com.lifeos.vault.domains.dto.response.ApiResponse;
import com.lifeos.vault.domains.dto.response.HealthSummaryResponse;
import com.lifeos.vault.service.HealthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/vault/health")
@RequiredArgsConstructor
public class HealthController {

  private final HealthService healthService;

  @GetMapping("/summary")
  public ResponseEntity<ApiResponse<HealthSummaryResponse>> getSummary(
      Authentication authentication) {
    return ResponseEntity.ok(
        ApiResponse.success(
            healthService.getSummary(authentication), "Health summary fetched successfully"));
  }
}
