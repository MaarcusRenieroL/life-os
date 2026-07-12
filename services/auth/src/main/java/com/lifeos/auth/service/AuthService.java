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
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    User existingUser =
        userService
            .findByEmail(email)
            .orElseThrow(() -> new InvalidCredentialsException("Invalid credentials"));

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

    return issueTokens(deviceSession);
  }

  @Transactional(noRollbackFor = InvalidCredentialsException.class)
  public AuthResponse refresh(String rawRefreshToken) {
    Instant now = Instant.now();

    String hashedToken = hashToken(rawRefreshToken);

    RefreshToken existingRefreshToken =
        refreshTokenRepository
            .findByTokenHash(hashedToken)
            .orElseThrow(() -> new InvalidCredentialsException("Invalid credentials"));

    DeviceSession deviceSession =
        deviceSessionRepository
            .findById(existingRefreshToken.getDeviceSessionId())
            .orElseThrow(() -> new InvalidCredentialsException("Invalid credentials"));

    if (deviceSession.getRevokedAt() != null) {
      throw new InvalidCredentialsException("Invalid credentials");
    }

    if (existingRefreshToken.getExpiresAt().isBefore(now)) {
      throw new InvalidCredentialsException("Invalid credentials");
    }

    if (existingRefreshToken.getRevokedAt() != null) {
      deviceSession.setRevokedAt(now);
      deviceSessionRepository.save(deviceSession);

      refreshTokenRepository.revokeAllBySessionId(existingRefreshToken.getDeviceSessionId());
      throw new InvalidCredentialsException("Invalid credentials");
    }

    existingRefreshToken.setRevokedAt(now);
    refreshTokenRepository.save(existingRefreshToken);

    return issueTokens(deviceSession);
  }

  public List<DeviceSession> listSessions(Authentication authentication) {

    UUID userId = (UUID) authentication.getPrincipal();

    return deviceSessionRepository.findByUserIdAndRevokedAtIsNull(userId);
  }

  @Transactional
  public void logout(UUID deviceSessionId, UUID authenticatedUserId) {
    DeviceSession deviceSession =
        deviceSessionRepository
            .findById(deviceSessionId)
            .orElseThrow(() -> new InvalidCredentialsException("Invalid session"));

    if (!deviceSession.getUserId().equals(authenticatedUserId)) {
      throw new InvalidCredentialsException("Invalid session");
    }

    deviceSession.setRevokedAt(Instant.now());

    deviceSessionRepository.save(deviceSession);

    refreshTokenRepository.revokeAllBySessionId(deviceSessionId);
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

  private AuthResponse issueTokens(DeviceSession deviceSession) {
    String accessToken = jwtService.generateAccessToken(deviceSession.getUserId());

    String rawRefreshToken = UUID.randomUUID().toString();

    RefreshToken refreshToken =
        RefreshToken.builder()
            .deviceSessionId(deviceSession.getId())
            .tokenHash(hashToken(rawRefreshToken))
            .expiresAt(Instant.now().plusMillis(refreshTokenExpiration))
            .build();

    refreshTokenRepository.save(refreshToken);

    return AuthResponse.builder().accessToken(accessToken).refreshToken(rawRefreshToken).build();
  }
}
