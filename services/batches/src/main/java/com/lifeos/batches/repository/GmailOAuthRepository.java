package com.lifeos.batches.repository;

import com.lifeos.batches.domains.entity.GmailOAuthToken;
import com.lifeos.batches.domains.enums.GmailPurpose;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GmailOAuthRepository extends JpaRepository<GmailOAuthToken, UUID> {
  List<GmailOAuthToken> findAllByUserId(UUID userId);

  Optional<GmailOAuthToken> findByUserIdAndPurpose(UUID userId, GmailPurpose purpose);
}
