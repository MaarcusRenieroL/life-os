package com.lifeos.finance_tracker.repository;

import com.lifeos.finance_tracker.domains.entity.TransactionCategory;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TransactionCategoryRepository extends JpaRepository<TransactionCategory, UUID> {

  List<TransactionCategory> findAllByTransactionId(UUID transactionId);

  List<TransactionCategory> findAllByTransactionIdIn(List<UUID> transactionIds);

  void deleteByTransactionId(UUID transactionId);
}
