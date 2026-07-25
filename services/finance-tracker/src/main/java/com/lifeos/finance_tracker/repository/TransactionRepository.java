package com.lifeos.finance_tracker.repository;

import com.lifeos.finance_tracker.domains.entity.Transaction;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TransactionRepository extends JpaRepository<Transaction, UUID> {

  List<Transaction> findAllByUserIdOrderByTransactionDateDesc(UUID userId);

  Optional<Transaction> findByIdAndUserId(UUID id, UUID userId);

  List<Transaction> findAllByIdInAndUserId(List<UUID> ids, UUID userId);

  void deleteByIdAndUserId(UUID id, UUID userId);

  boolean existsBySourceReference(String sourceReference);
}
