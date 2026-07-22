package com.lifeos.vault.controller;

import com.lifeos.vault.domains.dto.request.GenerateRecoveryCodesRequest;
import com.lifeos.vault.domains.dto.request.RedeemRecoveryCodeRequest;
import com.lifeos.vault.domains.dto.request.ResetWithRecoveryCodeRequest;
import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.vault.domains.dto.response.RecoveryCodeStatusResponse;
import com.lifeos.vault.domains.dto.response.RecoveryCodesResponse;
import com.lifeos.vault.service.RecoveryCodeService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/vault/recovery-codes")
@RequiredArgsConstructor
public class RecoveryCodeController {

  private final RecoveryCodeService recoveryCodeService;

  @PostMapping("/generate")
  public ResponseEntity<ApiResponse<RecoveryCodesResponse>> generate(
      Authentication authentication, @Valid @RequestBody GenerateRecoveryCodesRequest request) {
    UUID userId = (UUID) authentication.getPrincipal();
    List<String> codes = recoveryCodeService.generate(userId, request.getCurrentPassword());

    return ResponseEntity.ok(
        ApiResponse.success(
            RecoveryCodesResponse.builder().codes(codes).build(),
            "Recovery codes generated successfully"));
  }

  @GetMapping
  public ResponseEntity<ApiResponse<List<RecoveryCodeStatusResponse>>> list(
      Authentication authentication) {
    UUID userId = (UUID) authentication.getPrincipal();

    return ResponseEntity.ok(
        ApiResponse.success(
            recoveryCodeService.listStatus(userId), "Recovery codes fetched successfully"));
  }

  @PostMapping("/redeem")
  public ResponseEntity<ApiResponse<Void>> redeem(
      Authentication authentication, @Valid @RequestBody RedeemRecoveryCodeRequest request) {
    UUID userId = (UUID) authentication.getPrincipal();
    recoveryCodeService.redeem(userId, request.getCode());

    return ResponseEntity.ok(ApiResponse.success(null, "Recovery code redeemed successfully"));
  }

  @PostMapping("/reset")
  public ResponseEntity<ApiResponse<Void>> reset(
      Authentication authentication, @Valid @RequestBody ResetWithRecoveryCodeRequest request) {
    UUID userId = (UUID) authentication.getPrincipal();
    recoveryCodeService.resetWithCode(userId, request.getCode(), request.getNewMasterPassword());

    return ResponseEntity.ok(ApiResponse.success(null, "Master password reset successfully"));
  }
}
