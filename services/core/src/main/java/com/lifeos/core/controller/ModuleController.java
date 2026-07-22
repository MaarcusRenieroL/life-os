package com.lifeos.core.controller;

import com.lifeos.core.domains.dto.request.UpdateModuleSettingRequest;
import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.core.domains.dto.response.ModuleSettingResponse;
import com.lifeos.core.service.ModuleSettingService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/core/modules")
@RequiredArgsConstructor
public class ModuleController {

  private final ModuleSettingService moduleSettingService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<ModuleSettingResponse>>> list(
      Authentication authentication) {
    UUID userId = (UUID) authentication.getPrincipal();

    return ResponseEntity.ok(
        ApiResponse.success(
            moduleSettingService.getSettings(userId), "Module settings fetched successfully"));
  }

  @PutMapping("/{code}")
  public ResponseEntity<ApiResponse<ModuleSettingResponse>> update(
      Authentication authentication,
      @PathVariable String code,
      @RequestBody UpdateModuleSettingRequest request) {
    UUID userId = (UUID) authentication.getPrincipal();

    return ResponseEntity.ok(
        ApiResponse.success(
            moduleSettingService.setEnabled(userId, code, request.isEnabled()),
            "Module setting updated successfully"));
  }
}
