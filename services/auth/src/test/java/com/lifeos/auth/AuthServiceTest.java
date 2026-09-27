package com.lifeos.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.lifeos.auth.domains.dto.response.AuthResponse;
import com.lifeos.auth.domains.entity.DeviceSession;
import com.lifeos.auth.domains.entity.RefreshToken;
import com.lifeos.auth.domains.entity.User;
import com.lifeos.auth.exception.InvalidCredentialsException;
import com.lifeos.auth.repository.BiometricEnrollmentRepository;
import com.lifeos.auth.repository.DeviceSessionRepository;
import com.lifeos.auth.repository.RefreshTokenRepository;
import com.lifeos.auth.service.AccessTokenService;
import com.lifeos.auth.service.AuthService;
import com.lifeos.auth.service.UserService;
import com.lifeos.auth.store.ChallengeStore;
import com.lifeos.common.events.AuditEventPublisher;
import com.lifeos.common.events.AuditEventType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

  @Mock private PasswordEncoder passwordEncoder;
  @Mock private AccessTokenService accessTokenService;
  @Mock private UserService userService;
  @Mock private ChallengeStore challengeStore;
  @Mock private DeviceSessionRepository deviceSessionRepository;
  @Mock private RefreshTokenRepository refreshTokenRepository;
  @Mock private BiometricEnrollmentRepository biometricEnrollmentRepository;
  @Mock private AuditEventPublisher auditEventPublisher;

  @InjectMocks private AuthService authService;

  private final UUID userId = UUID.randomUUID();

  @BeforeEach
  void setUp() {
    ReflectionTestUtils.setField(authService, "refreshTokenExpiration", 3_600_000L);
  }

  private User userWithHash(String hash) {
    return User.builder().id(userId).email("jane@example.com").passwordHash(hash).build();
  }

  private void stubSessionSaveAssignsId() {
    when(deviceSessionRepository.save(any(DeviceSession.class)))
        .thenAnswer(
            invocation -> {
              DeviceSession session = invocation.getArgument(0);
              if (session.getId() == null) {
                session.setId(UUID.randomUUID());
              }
              return session;
            });
  }

  // ---------- login ----------

  @Test
  void loginSucceedsWithCorrectCredentialsAndIssuesTokens() {
    when(userService.findByEmail("jane@example.com"))
        .thenReturn(Optional.of(userWithHash("hashed-pw")));
    when(passwordEncoder.matches("correct-password", "hashed-pw")).thenReturn(true);
    stubSessionSaveAssignsId();
    when(accessTokenService.generateAccessToken(userId)).thenReturn("access-token-123");

    AuthResponse response =
        authService.login("jane@example.com", "correct-password", "Pixel 8", "ANDROID");

    assertThat(response.getAccessToken()).isEqualTo("access-token-123");
    assertThat(response.getRefreshToken()).isNotBlank();
    assertThat(response.getDeviceSessionId()).isNotNull();

    verify(auditEventPublisher)
        .publish(
            eq(userId),
            eq(AuditEventType.LOGIN_SUCCESS),
            any(String.class),
            any());
    verify(refreshTokenRepository).save(any(RefreshToken.class));
  }

  @Test
  void loginFailsWithWrongPassword() {
    when(userService.findByEmail("jane@example.com"))
        .thenReturn(Optional.of(userWithHash("hashed-pw")));
    when(passwordEncoder.matches("wrong-password", "hashed-pw")).thenReturn(false);

    assertThatThrownBy(
            () -> authService.login("jane@example.com", "wrong-password", "Pixel 8", "ANDROID"))
        .isInstanceOf(InvalidCredentialsException.class);

    verify(deviceSessionRepository, never()).save(any());
    verify(auditEventPublisher, never()).publish(any(), any(), any(), any());
  }

  @Test
  void loginFailsWithUnknownEmail() {
    when(userService.findByEmail("ghost@example.com")).thenReturn(Optional.empty());

    assertThatThrownBy(
            () -> authService.login("ghost@example.com", "whatever", "Pixel 8", "ANDROID"))
        .isInstanceOf(InvalidCredentialsException.class);

    verify(passwordEncoder, never()).matches(any(), any());
    verify(deviceSessionRepository, never()).save(any());
  }

  // ---------- refresh ----------

  @Test
  void refreshSucceedsWithValidTokenAndRevokesOldOne() {
    UUID sessionId = UUID.randomUUID();
    RefreshToken existingToken =
        RefreshToken.builder()
            .id(UUID.randomUUID())
            .deviceSessionId(sessionId)
            .expiresAt(Instant.now().plusSeconds(60))
            .revokedAt(null)
            .build();
    DeviceSession session =
        DeviceSession.builder().id(sessionId).userId(userId).revokedAt(null).build();

    when(refreshTokenRepository.findByTokenHash(any())).thenReturn(Optional.of(existingToken));
    when(deviceSessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
    when(accessTokenService.generateAccessToken(userId)).thenReturn("new-access-token");

    AuthResponse response = authService.refresh("raw-refresh-token");

    assertThat(response.getAccessToken()).isEqualTo("new-access-token");
    assertThat(response.getRefreshToken()).isNotBlank();
    assertThat(existingToken.getRevokedAt()).isNotNull();

    verify(refreshTokenRepository).save(existingToken);
    verify(refreshTokenRepository, never()).revokeAllBySessionId(any());
  }

  @Test
  void refreshFailsWithUnknownToken() {
    when(refreshTokenRepository.findByTokenHash(any())).thenReturn(Optional.empty());

    assertThatThrownBy(() -> authService.refresh("bogus-token"))
        .isInstanceOf(InvalidCredentialsException.class);

    verify(accessTokenService, never()).generateAccessToken(any());
  }

  @Test
  void refreshFailsWithExpiredToken() {
    UUID sessionId = UUID.randomUUID();
    RefreshToken expiredToken =
        RefreshToken.builder()
            .deviceSessionId(sessionId)
            .expiresAt(Instant.now().minusSeconds(60))
            .revokedAt(null)
            .build();
    DeviceSession session =
        DeviceSession.builder().id(sessionId).userId(userId).revokedAt(null).build();

    when(refreshTokenRepository.findByTokenHash(any())).thenReturn(Optional.of(expiredToken));
    when(deviceSessionRepository.findById(sessionId)).thenReturn(Optional.of(session));

    assertThatThrownBy(() -> authService.refresh("expired-token"))
        .isInstanceOf(InvalidCredentialsException.class);

    verify(accessTokenService, never()).generateAccessToken(any());
    verify(refreshTokenRepository, never()).save(any());
  }

  @Test
  void refreshFailsAndRevokesWholeSessionWhenTokenReuseIsDetected() {
    UUID sessionId = UUID.randomUUID();
    RefreshToken revokedToken =
        RefreshToken.builder()
            .deviceSessionId(sessionId)
            .expiresAt(Instant.now().plusSeconds(60))
            .revokedAt(Instant.now().minusSeconds(30))
            .build();
    DeviceSession session =
        DeviceSession.builder().id(sessionId).userId(userId).revokedAt(null).build();

    when(refreshTokenRepository.findByTokenHash(any())).thenReturn(Optional.of(revokedToken));
    when(deviceSessionRepository.findById(sessionId)).thenReturn(Optional.of(session));

    assertThatThrownBy(() -> authService.refresh("reused-token"))
        .isInstanceOf(InvalidCredentialsException.class);

    assertThat(session.getRevokedAt()).isNotNull();
    verify(deviceSessionRepository).save(session);
    verify(refreshTokenRepository).revokeAllBySessionId(sessionId);
    verify(accessTokenService, never()).generateAccessToken(any());
  }

  @Test
  void refreshFailsWhenDeviceSessionAlreadyRevoked() {
    UUID sessionId = UUID.randomUUID();
    RefreshToken token =
        RefreshToken.builder()
            .deviceSessionId(sessionId)
            .expiresAt(Instant.now().plusSeconds(60))
            .revokedAt(null)
            .build();
    DeviceSession revokedSession =
        DeviceSession.builder().id(sessionId).userId(userId).revokedAt(Instant.now()).build();

    when(refreshTokenRepository.findByTokenHash(any())).thenReturn(Optional.of(token));
    when(deviceSessionRepository.findById(sessionId)).thenReturn(Optional.of(revokedSession));

    assertThatThrownBy(() -> authService.refresh("token-for-revoked-session"))
        .isInstanceOf(InvalidCredentialsException.class);

    verify(refreshTokenRepository, never()).save(any());
    verify(accessTokenService, never()).generateAccessToken(any());
  }

  // ---------- logout ----------

  @Test
  void logoutRevokesSessionAndItsTokensWhenOwnedByCaller() {
    UUID sessionId = UUID.randomUUID();
    DeviceSession session =
        DeviceSession.builder()
            .id(sessionId)
            .userId(userId)
            .deviceName("Pixel 8")
            .revokedAt(null)
            .build();

    when(deviceSessionRepository.findById(sessionId)).thenReturn(Optional.of(session));

    authService.logout(sessionId, userId);

    assertThat(session.getRevokedAt()).isNotNull();
    verify(deviceSessionRepository).save(session);
    verify(refreshTokenRepository, times(1)).revokeAllBySessionId(sessionId);
    verify(auditEventPublisher)
        .publish(eq(userId), eq(AuditEventType.SESSION_REVOKED), any(String.class), any());
  }

  @Test
  void logoutRejectsSessionBelongingToAnotherUser() {
    UUID sessionId = UUID.randomUUID();
    UUID otherUserId = UUID.randomUUID();
    DeviceSession session =
        DeviceSession.builder().id(sessionId).userId(otherUserId).revokedAt(null).build();

    when(deviceSessionRepository.findById(sessionId)).thenReturn(Optional.of(session));

    assertThatThrownBy(() -> authService.logout(sessionId, userId))
        .isInstanceOf(InvalidCredentialsException.class);

    assertThat(session.getRevokedAt()).isNull();
    verify(deviceSessionRepository, never()).save(any());
    verify(refreshTokenRepository, never()).revokeAllBySessionId(any());
  }

  @Test
  void logoutFailsForUnknownSession() {
    UUID sessionId = UUID.randomUUID();
    when(deviceSessionRepository.findById(sessionId)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> authService.logout(sessionId, userId))
        .isInstanceOf(InvalidCredentialsException.class);

    verify(refreshTokenRepository, never()).revokeAllBySessionId(any());
  }

  // ---------- listSessions ----------

  @Test
  void listSessionsReturnsOnlyActiveSessionsScopedToUser() {
    DeviceSession session1 = DeviceSession.builder().id(UUID.randomUUID()).userId(userId).build();
    DeviceSession session2 = DeviceSession.builder().id(UUID.randomUUID()).userId(userId).build();

    when(deviceSessionRepository.findByUserIdAndRevokedAtIsNull(userId))
        .thenReturn(List.of(session1, session2));

    List<DeviceSession> sessions = authService.listSessions(userId);

    assertThat(sessions).containsExactlyInAnyOrder(session1, session2);
    verify(deviceSessionRepository).findByUserIdAndRevokedAtIsNull(userId);
  }

  @Test
  void listSessionsDoesNotLeakOtherUsersSessions() {
    UUID otherUserId = UUID.randomUUID();
    when(deviceSessionRepository.findByUserIdAndRevokedAtIsNull(userId)).thenReturn(List.of());

    List<DeviceSession> sessions = authService.listSessions(userId);

    assertThat(sessions).isEmpty();
    verify(deviceSessionRepository, never()).findByUserIdAndRevokedAtIsNull(otherUserId);
  }
}
