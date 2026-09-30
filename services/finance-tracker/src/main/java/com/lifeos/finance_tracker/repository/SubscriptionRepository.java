package com.lifeos.finance_tracker.repository;

import com.lifeos.finance_tracker.domains.entity.Subscription;
import com.lifeos.finance_tracker.domains.enums.SubscriptionStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubscriptionRepository extends JpaRepository<Subscription, UUID> {

  List<Subscription> findAllByUserIdOrderByNextBillingDateAsc(UUID userId);

  Optional<Subscription> findByIdAndUserId(UUID id, UUID userId);

  // The scheduled jobs sweep every user's subscriptions, not one user's.
  List<Subscription> findAllByStatus(SubscriptionStatus status);
}
