package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.Referral;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReferralRepository extends JpaRepository<Referral, UUID> {

  List<Referral> findAllByApplicationIdOrderByCreatedAtDesc(UUID applicationId);

  Optional<Referral> findByApplicationIdAndContactId(UUID applicationId, UUID contactId);
}
