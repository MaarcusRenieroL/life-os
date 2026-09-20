package com.lifeos.core.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.core.domains.dto.request.UpsertUserSettingRequest;
import com.lifeos.core.domains.dto.response.UserSettingResponse;
import com.lifeos.core.service.UserSettingService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/core/settings")
@RequiredArgsConstructor
public class UserSettingController {

  private final UserSettingService userSettingService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<UserSettingResponse>>> list(Authentication authentication) {
    UUID userId = (UUID) authentication.getPrincipal();

    return ResponseEntity.ok(
        ApiResponse.success(userSettingService.getAll(userId), "Settings fetched successfully"));
  }

  @GetMapping("/{module}")
  public ResponseEntity<ApiResponse<List<UserSettingResponse>>> listForModule(
      Authentication authentication, @PathVariable String module) {
    UUID userId = (UUID) authentication.getPrincipal();

    return ResponseEntity.ok(
        ApiResponse.success(
            userSettingService.getForModule(userId, module), "Settings fetched successfully"));
  }

  @PutMapping("/{module}/{key}")
  public ResponseEntity<ApiResponse<UserSettingResponse>> set(
      Authentication authentication,
      @PathVariable String module,
      @PathVariable String key,
      @RequestBody UpsertUserSettingRequest request) {
    UUID userId = (UUID) authentication.getPrincipal();

    return ResponseEntity.ok(
        ApiResponse.success(
            userSettingService.set(userId, module, key, request.getValue()),
            "Setting updated successfully"));
  }

  @DeleteMapping("/{module}/{key}")
  public ResponseEntity<ApiResponse<Void>> delete(
      Authentication authentication, @PathVariable String module, @PathVariable String key) {
    UUID userId = (UUID) authentication.getPrincipal();

    userSettingService.delete(userId, module, key);

    return ResponseEntity.ok(ApiResponse.success(null, "Setting deleted successfully"));
  }
}
