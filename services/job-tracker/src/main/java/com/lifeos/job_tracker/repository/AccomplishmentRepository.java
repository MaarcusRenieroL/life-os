package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.Accomplishment;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccomplishmentRepository extends JpaRepository<Accomplishment, UUID> {

  List<Accomplishment> findAllByUserIdOrderByUsageCountDescCreatedAtDesc(UUID userId);

  List<Accomplishment> findAllByUserIdAndCategoryOrderByUsageCountDescCreatedAtDesc(
      UUID userId, String category);

  Optional<Accomplishment> findByIdAndUserId(UUID id, UUID userId);

  List<Accomplishment> findAllByUserIdAndBulletTextContainingIgnoreCase(UUID userId, String search);
}
