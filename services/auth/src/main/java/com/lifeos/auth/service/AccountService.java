package com.lifeos.auth.service;

import com.lifeos.auth.domains.entity.DeviceSession;
import com.lifeos.auth.repository.BiometricEnrollmentRepository;
import com.lifeos.auth.repository.DeviceSessionRepository;
import com.lifeos.auth.repository.RefreshTokenRepository;
import com.lifeos.auth.repository.UserRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Auth-side half of account deletion - the User row itself, plus everything that
 * references it (sessions, refresh tokens, biometric enrollments). The vault-side half
 * (VaultAccountService in vault-service) is a separate call the frontend makes first,
 * since auth-service has no access to vault-service's database.
 */
@Service
@RequiredArgsConstructor
public class AccountService {

  private final UserRepository userRepository;
  private final DeviceSessionRepository deviceSessionRepository;
  private final RefreshTokenRepository refreshTokenRepository;
  private final BiometricEnrollmentRepository biometricEnrollmentRepository;

  @Transactional
  public void deleteAccount(UUID userId) {
    // RefreshToken references deviceSessionId, not userId directly, so its rows have
    // to be deleted per-session before the sessions themselves can go.
    List<DeviceSession> sessions = deviceSessionRepository.findAllByUserId(userId);

    for (DeviceSession session : sessions) {
      refreshTokenRepository.deleteByDeviceSessionId(session.getId());
    }

    deviceSessionRepository.deleteAllByUserId(userId);
    biometricEnrollmentRepository.deleteAllByUserId(userId);
    userRepository.deleteById(userId);
  }
}
