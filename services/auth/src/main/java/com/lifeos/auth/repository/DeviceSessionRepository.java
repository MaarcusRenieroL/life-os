package com.lifeos.auth.repository;

import com.lifeos.auth.domains.entity.DeviceSession;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DeviceSessionRepository extends JpaRepository<DeviceSession, UUID> {

  List<DeviceSession> findByUserIdAndRevokedAtIsNull(UUID userId);

  List<DeviceSession> findAllByUserId(UUID userId);

  void deleteAllByUserId(UUID userId);
}
