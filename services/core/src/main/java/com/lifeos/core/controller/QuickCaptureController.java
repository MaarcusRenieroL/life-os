package com.lifeos.core.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.core.domains.dto.request.QuickCaptureRequest;
import com.lifeos.core.domains.record.QuickCaptureResult;
import com.lifeos.core.service.QuickCaptureService;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/core/quick-capture")
@RequiredArgsConstructor
public class QuickCaptureController {

  private final QuickCaptureService quickCaptureService;

  @PostMapping
  public ResponseEntity<ApiResponse<QuickCaptureResult>> capture(
      Authentication authentication, @Valid @RequestBody QuickCaptureRequest request) {
    UUID userId = (UUID) authentication.getPrincipal();

    QuickCaptureResult result =
        quickCaptureService.capture(userId, request.getText(), request.isUseClaudeFallback());

    return ResponseEntity.ok(ApiResponse.success(result, "Quick capture processed"));
  }
}
