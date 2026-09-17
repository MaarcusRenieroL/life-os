package com.lifeos.batches.repository;

import com.lifeos.batches.domains.entity.GmailOAuthToken;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GmailOAuthRepository extends JpaRepository<GmailOAuthToken, UUID> {
  Optional<GmailOAuthToken> findByUserId(UUID userId);
}
