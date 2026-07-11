package com.lifeos.auth.service;

import com.lifeos.auth.domains.dto.response.AuthResponse;
import com.lifeos.auth.domains.entity.DeviceSession;
import com.lifeos.auth.domains.entity.RefreshToken;
import com.lifeos.auth.domains.entity.User;
import com.lifeos.auth.exception.EmailAlreadyExistsException;
import com.lifeos.auth.exception.InvalidCredentialsException;
import com.lifeos.auth.repository.DeviceSessionRepository;
import com.lifeos.auth.repository.RefreshTokenRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

  @Value("${jwt.refresh-token-expiration-ms}")
  private long refreshTokenExpiration;

  private final PasswordEncoder passwordEncoder;

  private final JwtService jwtService;
  private final UserService userService;

  private final DeviceSessionRepository deviceSessionRepository;
  private final RefreshTokenRepository refreshTokenRepository;

  public void register(String email, String rawPassword) {
    boolean isExistingUser = userService.existsByEmail(email);

    if (isExistingUser) {
      throw new EmailAlreadyExistsException(email);
    }

    userService.createUser(email, passwordEncoder.encode(rawPassword));
  }

  public AuthResponse login(
      String email, String rawPassword, String deviceName, String deviceType) {
    Optional<User> optionalUser = userService.findByEmail(email);

    if (optionalUser.isEmpty()) {
      throw new InvalidCredentialsException("Invalid credentials");
    }

    User existingUser = optionalUser.get();

    if (!passwordEncoder.matches(rawPassword, existingUser.getPasswordHash())) {
      throw new InvalidCredentialsException("Invalid credentials");
    }
    DeviceSession deviceSession =
        DeviceSession.builder()
            .deviceName(deviceName)
            .deviceType(deviceType)
            .userId(existingUser.getId())
            .build();

    deviceSessionRepository.save(deviceSession);

    String accessToken = jwtService.generateAccessToken(existingUser.getId());
    String randomRefreshToken = UUID.randomUUID().toString();

    RefreshToken refreshToken =
        RefreshToken.builder()
            .deviceSessionId(deviceSession.getId())
            .tokenHash(hashToken(randomRefreshToken))
            .expiresAt(Instant.now().plusMillis(refreshTokenExpiration))
            .build();

    refreshTokenRepository.save(refreshToken);

    return AuthResponse.builder().accessToken(accessToken).refreshToken(randomRefreshToken).build();
  }

  private String hashToken(String rawToken) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");

      byte[] hashBytes = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));

      return Base64.getEncoder().encodeToString(hashBytes);
    } catch (NoSuchAlgorithmException e) {
      throw new RuntimeException(e);
    }
  }
}
