package com.lifeos.auth.repository;

import com.lifeos.auth.domains.entity.RefreshToken;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

  Optional<RefreshToken> findByTokenHash(String tokenHash);

  @Modifying
  @Query(
      "update RefreshToken rt set rt.revokedAt = CURRENT_TIMESTAMP where rt.deviceSessionId ="
          + " :deviceSessionId and rt.revokedAt is null")
  int revokeAllBySessionId(@Param("deviceSessionId") UUID deviceSessionId);
}
