package com.lifeos.auth;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.lifeos.auth.domains.entity.DeviceSession;
import com.lifeos.auth.repository.BiometricEnrollmentRepository;
import com.lifeos.auth.repository.DeviceSessionRepository;
import com.lifeos.auth.repository.RefreshTokenRepository;
import com.lifeos.auth.repository.UserRepository;
import com.lifeos.auth.service.AccountService;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AccountServiceTest {

  @Mock private UserRepository userRepository;
  @Mock private DeviceSessionRepository deviceSessionRepository;
  @Mock private RefreshTokenRepository refreshTokenRepository;
  @Mock private BiometricEnrollmentRepository biometricEnrollmentRepository;

  @InjectMocks private AccountService accountService;

  private final UUID userId = UUID.randomUUID();

  @Test
  void deleteAccountDeletesRefreshTokensForEverySessionBeforeDeletingSessionsAndUser() {
    UUID session1Id = UUID.randomUUID();
    UUID session2Id = UUID.randomUUID();
    DeviceSession session1 = DeviceSession.builder().id(session1Id).userId(userId).build();
    DeviceSession session2 = DeviceSession.builder().id(session2Id).userId(userId).build();

    when(deviceSessionRepository.findAllByUserId(userId)).thenReturn(List.of(session1, session2));

    accountService.deleteAccount(userId);

    verify(refreshTokenRepository).deleteByDeviceSessionId(session1Id);
    verify(refreshTokenRepository).deleteByDeviceSessionId(session2Id);
    verify(refreshTokenRepository, times(2)).deleteByDeviceSessionId(any());
    verify(deviceSessionRepository).deleteAllByUserId(userId);
    verify(biometricEnrollmentRepository).deleteAllByUserId(userId);
    verify(userRepository).deleteById(userId);
  }

  @Test
  void deleteAccountStillCleansUpRemainingDataWhenUserHasNoSessions() {
    when(deviceSessionRepository.findAllByUserId(userId)).thenReturn(List.of());

    accountService.deleteAccount(userId);

    verify(refreshTokenRepository, never()).deleteByDeviceSessionId(any());
    verify(deviceSessionRepository).deleteAllByUserId(userId);
    verify(biometricEnrollmentRepository).deleteAllByUserId(userId);
    verify(userRepository).deleteById(userId);
  }

  @Test
  void deleteAccountDoesNotTouchAnotherUsersSessionsOrTokens() {
    UUID otherUserId = UUID.randomUUID();
    when(deviceSessionRepository.findAllByUserId(userId)).thenReturn(List.of());

    accountService.deleteAccount(userId);

    verify(deviceSessionRepository, never()).findAllByUserId(otherUserId);
    verify(deviceSessionRepository, never()).deleteAllByUserId(otherUserId);
    verify(userRepository, never()).deleteById(otherUserId);
  }
}
