package com.lifeos.auth.repository;

import com.lifeos.auth.domains.entity.RefreshToken;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

  /** Locked so two simultaneous refreshes with one token cannot both pass the "not yet used" check. */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  Optional<RefreshToken> findByTokenHash(String tokenHash);

  @Modifying
  @Query(
      "update RefreshToken rt set rt.revokedAt = CURRENT_TIMESTAMP where rt.deviceSessionId ="
          + " :deviceSessionId and rt.revokedAt is null")
  int revokeAllBySessionId(@Param("deviceSessionId") UUID deviceSessionId);

  void deleteByDeviceSessionId(UUID deviceSessionId);
}
