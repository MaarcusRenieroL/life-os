package com.lifeos.finance_tracker.repository;

import com.lifeos.finance_tracker.domains.entity.Budget;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BudgetRepository extends JpaRepository<Budget, UUID> {

  List<Budget> findAllByUserId(UUID userId);

  Optional<Budget> findByIdAndUserId(UUID id, UUID userId);

  void deleteByIdAndUserId(UUID id, UUID userId);
}
