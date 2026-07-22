package com.lifeos.auth.service;

import com.lifeos.auth.domains.dto.response.AuthResponse;
import com.lifeos.auth.domains.dto.response.ChallengeResponse;
import com.lifeos.auth.domains.entity.BiometricEnrollment;
import com.lifeos.auth.domains.entity.DeviceSession;
import com.lifeos.auth.domains.entity.RefreshToken;
import com.lifeos.auth.domains.entity.User;
import com.lifeos.auth.domains.record.ChallengeRecord;
import com.lifeos.auth.exception.EmailAlreadyExistsException;
import com.lifeos.auth.exception.InvalidCredentialsException;
import com.lifeos.auth.publisher.AuditEventPublisher;
import com.lifeos.auth.repository.BiometricEnrollmentRepository;
import com.lifeos.auth.repository.DeviceSessionRepository;
import com.lifeos.auth.repository.RefreshTokenRepository;
import com.lifeos.auth.exception.BiometricAlreadyEnrolledException;
import com.lifeos.auth.store.ChallengeStore;
import com.lifeos.common.events.AuditEventType;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.PublicKey;
import java.security.SecureRandom;
import java.security.Signature;
import java.security.spec.X509EncodedKeySpec;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

  @Value("${jwt.refresh-token-expiration-ms}")
  private long refreshTokenExpiration;

  private final PasswordEncoder passwordEncoder;

  private final AccessTokenService accessTokenService;
  private final UserService userService;

  private final ChallengeStore challengeStore;

  private final DeviceSessionRepository deviceSessionRepository;
  private final RefreshTokenRepository refreshTokenRepository;
  private final BiometricEnrollmentRepository biometricEnrollmentRepository;
  private final AuditEventPublisher auditEventPublisher;

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

    auditEventPublisher.publish(
        existingUser.getId(),
        AuditEventType.LOGIN_SUCCESS,
        "Signed in from " + deviceName,
        Map.of("device", deviceName, "deviceType", deviceType));

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

  public List<DeviceSession> listSessions(UUID userId) {
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

    auditEventPublisher.publish(
        authenticatedUserId,
        AuditEventType.SESSION_REVOKED,
        "Signed out from " + deviceSession.getDeviceName(),
        Map.of("device", deviceSession.getDeviceName(), "reason", "user_initiated"));
  }

  public void enrollBiometric(UUID userId, String publicKey, String deviceId, String type) {

    boolean isExistingBiometric =
        biometricEnrollmentRepository.existsByUserIdAndDeviceId(userId, deviceId);

    if (isExistingBiometric) {
      throw new BiometricAlreadyEnrolledException(deviceId);
    }

    biometricEnrollmentRepository.save(
        BiometricEnrollment.builder()
            .userId(userId)
            .publicKey(publicKey)
            .deviceId(deviceId)
            .type(type)
            .build());
  }

  public ChallengeResponse createChallenge(String deviceId) {
    SecureRandom secureRandom = new SecureRandom();

    byte[] challengeBytes = new byte[32];

    secureRandom.nextBytes(challengeBytes);

    String challenge = Base64.getUrlEncoder().withoutPadding().encodeToString(challengeBytes);

    ChallengeRecord challengeRecord =
        new ChallengeRecord(challenge, Instant.now().plusSeconds(120));

    challengeStore.save(deviceId, challengeRecord);

    return ChallengeResponse.builder().challenge(challenge).build();
  }

  public AuthResponse biometricLogin(
      String deviceId, String signature, String deviceName, String deviceType) {

    ChallengeRecord challengeRecord = challengeStore.get(deviceId);
    // Single-use: consume the challenge now regardless of outcome, so a captured
    // signature can never be replayed against the same challenge twice.
    challengeStore.remove(deviceId);

    if (challengeRecord == null || challengeRecord.expiresAt().isBefore(Instant.now())) {
      throw new InvalidCredentialsException("Invalid credentials");
    }

    BiometricEnrollment enrollment =
        biometricEnrollmentRepository
            .findByDeviceId(deviceId)
            .orElseThrow(() -> new InvalidCredentialsException("Invalid credentials"));

    if (!verifySignature(enrollment.getPublicKey(), challengeRecord.challenge(), signature)) {
      throw new InvalidCredentialsException("Invalid credentials");
    }

    DeviceSession deviceSession =
        DeviceSession.builder()
            .deviceName(deviceName)
            .deviceType(deviceType)
            .userId(enrollment.getUserId())
            .build();

    deviceSessionRepository.save(deviceSession);

    auditEventPublisher.publish(
        enrollment.getUserId(),
        AuditEventType.LOGIN_SUCCESS,
        "Signed in from " + deviceName,
        Map.of("device", deviceName, "deviceType", deviceType));

    return issueTokens(deviceSession);
  }

  private boolean verifySignature(String publicKeyBase64, String challenge, String signatureBase64) {
    try {
      byte[] publicKeyBytes = Base64.getDecoder().decode(publicKeyBase64);
      X509EncodedKeySpec keySpec = new X509EncodedKeySpec(publicKeyBytes);
      PublicKey publicKey = KeyFactory.getInstance("EC").generatePublic(keySpec);

      Signature verifier = Signature.getInstance("SHA256withECDSA");
      verifier.initVerify(publicKey);
      verifier.update(challenge.getBytes(StandardCharsets.UTF_8));

      byte[] signatureBytes = Base64.getDecoder().decode(signatureBase64);
      return verifier.verify(signatureBytes);
    } catch (Exception e) {
      // Any malformed key/signature/algorithm mismatch means verification failed -
      // treat identically to "signature didn't match", not a server error.
      return false;
    }
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
    String accessToken = accessTokenService.generateAccessToken(deviceSession.getUserId());

    String rawRefreshToken = UUID.randomUUID().toString();

    RefreshToken refreshToken =
        RefreshToken.builder()
            .deviceSessionId(deviceSession.getId())
            .tokenHash(hashToken(rawRefreshToken))
            .expiresAt(Instant.now().plusMillis(refreshTokenExpiration))
            .build();

    refreshTokenRepository.save(refreshToken);

    return AuthResponse.builder()
        .accessToken(accessToken)
        .refreshToken(rawRefreshToken)
        .deviceSessionId(deviceSession.getId())
        .build();
  }
}
