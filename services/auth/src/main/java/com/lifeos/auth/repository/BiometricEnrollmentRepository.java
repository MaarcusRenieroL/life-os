package com.lifeos.auth.repository;

import com.lifeos.auth.domains.entity.BiometricEnrollment;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BiometricEnrollmentRepository extends JpaRepository<BiometricEnrollment, UUID> {

  boolean existsByUserIdAndDeviceId(UUID userId, String deviceId);

  /** A device id belongs to exactly one account: biometric login looks the enrollment up by it alone. */
  boolean existsByDeviceId(String deviceId);

  Optional<BiometricEnrollment> findByDeviceId(String deviceId);

  void deleteAllByUserId(UUID userId);
}
