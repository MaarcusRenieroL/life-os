package com.lifeos.finance_tracker.repository;

import com.lifeos.finance_tracker.domains.entity.Transaction;
import java.math.BigDecimal;
import java.time.Instant;
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

  // CSV import dedup - matches the spec's "same date + amount within ±1 =
  // likely duplicate" rule. transactionDateFrom/To is the caller-computed
  // ±1 day window; exact amount match (banks don't round differently across
  // formats, unlike dates which shift by timezone/format quirks).
  boolean existsByAccountIdAndAmountAndTransactionDateBetween(
      UUID accountId, BigDecimal amount, Instant transactionDateFrom, Instant transactionDateTo);
}
