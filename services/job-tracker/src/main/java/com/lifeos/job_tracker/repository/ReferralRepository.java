package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.Referral;
import com.lifeos.job_tracker.domains.enums.ReferralStatus;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReferralRepository extends JpaRepository<Referral, UUID> {

  List<Referral> findByJobIdAndUserIdOrderByCreatedAtDesc(UUID jobId, UUID userId);

  Optional<Referral> findByIdAndUserId(UUID id, UUID userId);

  List<Referral> findByUserId(UUID userId);

  List<Referral> findByUserIdAndFollowUpAtIsNotNull(UUID userId);

  /** Cross-user - backs {@code JobAttentionScanner}'s daily referral-follow-up-due scan. Statuses
   * in {@code excludedStatuses} are the terminal ones (responded/referred/declined) that no
   * longer need a follow-up nudge. */
  List<Referral> findByStatusNotInAndFollowUpAtLessThanEqual(
      Collection<ReferralStatus> excludedStatuses, LocalDate date);

  /** Scoped to one user - backs the internal {@code /today} endpoint. */
  List<Referral> findByUserIdAndStatusNotInAndFollowUpAtLessThanEqual(
      UUID userId, Collection<ReferralStatus> excludedStatuses, LocalDate date);
}
