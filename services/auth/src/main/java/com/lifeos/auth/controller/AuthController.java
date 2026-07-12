package com.lifeos.auth.controller;

import com.lifeos.auth.domains.dto.request.EnrollBiometricRequest;
import com.lifeos.auth.domains.dto.request.LogoutRequest;
import com.lifeos.auth.domains.dto.request.RefreshRequest;
import com.lifeos.auth.domains.dto.request.UserLoginRequest;
import com.lifeos.auth.domains.dto.request.UserRegisterRequest;
import com.lifeos.auth.domains.dto.response.ApiResponse;
import com.lifeos.auth.domains.dto.response.AuthResponse;
import com.lifeos.auth.domains.entity.DeviceSession;
import com.lifeos.auth.service.AuthService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/auth")
@RequiredArgsConstructor
public class AuthController {

  private final AuthService authService;

  @PostMapping("/register")
  public ResponseEntity<ApiResponse<Void>> register(
      @RequestBody UserRegisterRequest userRegisterRequest) {
    authService.register(userRegisterRequest.getEmail(), userRegisterRequest.getRawPassword());
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(ApiResponse.success(null, "User registered successfully"));
  }

  @PostMapping("/login")
  public ResponseEntity<ApiResponse<AuthResponse>> login(
      @RequestBody UserLoginRequest userLoginRequest) {
    AuthResponse authResponse =
        authService.login(
            userLoginRequest.getEmail(),
            userLoginRequest.getRawPassword(),
            userLoginRequest.getDeviceName(),
            userLoginRequest.getDeviceType());
    return ResponseEntity.ok(ApiResponse.success(authResponse, "Login successful"));
  }

  @PostMapping("/refresh")
  public ResponseEntity<ApiResponse<AuthResponse>> refresh(
      @RequestBody RefreshRequest refreshRequest) {
    AuthResponse authResponse = authService.refresh(refreshRequest.getRefreshToken());

    return ResponseEntity.ok(ApiResponse.success(authResponse, "Token refreshed successfully"));
  }

  @PostMapping("/logout")
  public ResponseEntity<ApiResponse<Void>> logout(@RequestBody LogoutRequest logoutRequest) {
    authService.logout(logoutRequest.getDeviceSessionId(), logoutRequest.getAuthenticatedUserId());

    return ResponseEntity.ok(ApiResponse.success(null, "User logged out successfully"));
  }

  @GetMapping("/sessions")
  public ResponseEntity<ApiResponse<List<DeviceSession>>> listSessions(
      Authentication authentication) {

    UUID userId = (UUID) authentication.getPrincipal();

    return ResponseEntity.ok(
        ApiResponse.success(authService.listSessions(userId), "Sessions listed successfully"));
  }

  @PostMapping("/sessions/{sessionId}/revoke")
  public ResponseEntity<ApiResponse<Void>> revokeSession(
      @PathVariable UUID sessionId, Authentication authentication) {
    authService.logout(sessionId, (UUID) authentication.getPrincipal());

    return ResponseEntity.ok(ApiResponse.success(null, "Session revoked successfully"));
  }

  @PostMapping("/enroll-biometric")
  public ResponseEntity<ApiResponse<Void>> enrollBiometric(
      Authentication authentication, @RequestBody EnrollBiometricRequest enrollBiometricRequest) {

    UUID userId = (UUID) authentication.getPrincipal();

    authService.enrollBiometric(
        userId,
        enrollBiometricRequest.getPublicKey(),
        enrollBiometricRequest.getDeviceId(),
        enrollBiometricRequest.getType());

    return ResponseEntity.ok(ApiResponse.success(null, "Biometric added successfully"));
  }
}
