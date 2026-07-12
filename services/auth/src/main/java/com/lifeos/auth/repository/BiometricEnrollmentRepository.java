package com.lifeos.auth.repository;

import com.lifeos.auth.domains.entity.BiometricEnrollment;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BiometricEnrollmentRepository extends JpaRepository<BiometricEnrollment, UUID> {

  boolean existsByUserIdAndDeviceId(UUID userId, String deviceId);
}
