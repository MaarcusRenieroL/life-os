package com.lifeos.finance_tracker.repository;

import com.lifeos.finance_tracker.domains.entity.Category;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryRepository extends JpaRepository<Category, UUID> {

  // Includes both this user's own categories and the global/system ones
  // (userId is null on those) - a category list should show both.
  List<Category> findAllByUserIdOrUserIdIsNull(UUID userId);

  Optional<Category> findByIdAndUserId(UUID id, UUID userId);

  void deleteByIdAndUserId(UUID id, UUID userId);
}
