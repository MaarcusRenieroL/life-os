package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.WatchedCompany;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface WatchedCompanyRepository extends JpaRepository<WatchedCompany, UUID> {

  List<WatchedCompany> findAllByUserIdOrderByNameAsc(UUID userId);

  List<WatchedCompany> findAllByUserIdAndActiveTrue(UUID userId);

  Optional<WatchedCompany> findByIdAndUserId(UUID id, UUID userId);

  boolean existsByUserIdAndNameIgnoreCase(UUID userId, String name);

  /** Cross-user - backs the daily discovery scan. */
  @Query("select distinct w.userId from WatchedCompany w where w.active = true")
  List<UUID> findUserIdsWithActiveWatches();
}
