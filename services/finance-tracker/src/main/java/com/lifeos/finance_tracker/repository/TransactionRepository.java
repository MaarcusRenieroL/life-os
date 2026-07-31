package com.lifeos.finance_tracker.repository;

import com.lifeos.finance_tracker.domains.entity.Transaction;
import com.lifeos.finance_tracker.domains.record.DashboardSummary;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TransactionRepository extends JpaRepository<Transaction, UUID> {

  List<Transaction> findAllByUserIdOrderByTransactionDateDesc(UUID userId);

  Page<Transaction> findAllByUserId(UUID userId, Pageable pageable);

  Optional<Transaction> findByIdAndUserId(UUID id, UUID userId);

  List<Transaction> findAllByIdInAndUserId(List<UUID> ids, UUID userId);

  void deleteByIdAndUserId(UUID id, UUID userId);

  boolean existsBySourceReference(String sourceReference);

  boolean existsByAccountIdAndAmountAndTransactionDateBetweenAndDescription(
      UUID accountId,
      BigDecimal amount,
      Instant transactionDateFrom,
      Instant transactionDateTo,
      String description);

  @Query(
      "SELECT new com.lifeos.finance_tracker.domains.record.DashboardSummary("
          + "  COALESCE(SUM(CASE WHEN t.type = 'CREDIT' THEN t.amount ELSE 0 END), 0), "
          + "  COALESCE(SUM(CASE WHEN t.type = 'DEBIT' THEN t.amount ELSE 0 END), 0), "
          + "  NULL"
          + ") "
          + "FROM Transaction t "
          + "WHERE t.userId = :userId AND t.transactionDate BETWEEN :start AND :end")
  DashboardSummary getDashboardSummary(
      @Param("userId") UUID userId, @Param("start") Instant start, @Param("end") Instant end);

  @Query(
      "SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t "
          + "WHERE t.userId = :userId AND t.categoryId = :categoryId AND t.type = 'DEBIT' "
          + "AND t.transactionDate BETWEEN :start AND :end")
  BigDecimal sumCategorySpendByPeriod(
      @Param("userId") UUID userId,
      @Param("categoryId") UUID categoryId,
      @Param("start") Instant start,
      @Param("end") Instant end);

  @Query(
      value =
          "SELECT TO_CHAR(DATE_TRUNC('month', transaction_date), 'YYYY-MM') as month, "
              + "COALESCE(SUM(amount), 0) as total_spend "
              + "FROM finance_schema.transactions "
              + "WHERE user_id = :userId AND type = 'DEBIT' "
              + "AND transaction_date >= :since "
              + "GROUP BY DATE_TRUNC('month', transaction_date) "
              + "ORDER BY month DESC",
      nativeQuery = true)
  List<Object[]> getMonthlyTrendsRaw(@Param("userId") UUID userId, @Param("since") Instant since);

  @Query(
      value =
          "SELECT LOWER(TRIM(description)) as merchant, COALESCE(SUM(amount), 0) as total_spend "
              + "FROM finance_schema.transactions "
              + "WHERE user_id = :userId AND type = 'DEBIT' "
              + "GROUP BY LOWER(TRIM(description)) "
              + "ORDER BY total_spend DESC "
              + "LIMIT :limit",
      nativeQuery = true)
  List<Object[]> getTopMerchantsRaw(@Param("userId") UUID userId, @Param("limit") int limit);

  List<Transaction> findAllByUserIdAndTransactionDateBetweenOrderByTransactionDateAsc(
      UUID userId, Instant start, Instant end);
}
