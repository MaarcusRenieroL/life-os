package com.lifeos.auth.controller;

import com.lifeos.auth.domains.dto.request.UserLoginRequest;
import com.lifeos.auth.domains.dto.request.UserRegisterRequest;
import com.lifeos.auth.domains.dto.response.ApiResponse;
import com.lifeos.auth.domains.dto.response.AuthResponse;
import com.lifeos.auth.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
}
