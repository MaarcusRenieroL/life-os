package com.lifeos.finance_tracker.repository;

import com.lifeos.finance_tracker.domains.entity.Transaction;
import com.lifeos.finance_tracker.domains.enums.SourceType;
import com.lifeos.finance_tracker.domains.enums.TransactionType;
import com.lifeos.finance_tracker.domains.record.CategoryPeriodSpend;
import com.lifeos.finance_tracker.domains.record.DashboardSummary;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TransactionRepository
    extends JpaRepository<Transaction, UUID>, JpaSpecificationExecutor<Transaction> {

  List<Transaction> findAllByUserIdOrderByTransactionDateDesc(UUID userId);

  List<Transaction> findAllByUserIdAndDescriptionIgnoreCase(UUID userId, String description);

  Page<Transaction> findAllByUserId(UUID userId, Pageable pageable);

  Optional<Transaction> findByIdAndUserId(UUID id, UUID userId);

  List<Transaction> findAllByIdInAndUserId(List<UUID> ids, UUID userId);

  void deleteByIdAndUserId(UUID id, UUID userId);

  boolean existsBySourceReference(String sourceReference);

  List<Transaction> findAllByUserIdAndSourceReferenceStartingWithOrderByTransactionDateDesc(
      UUID userId, String sourceReferencePrefix);

  /**
   * Count of transactions still awaiting a category - what the home and finance dashboards show as
   * "N need review". Both used to fetch a page of 50 full transactions and filter it client-side,
   * which both over-fetched and silently undercounted once a user had more than 50 uncategorized.
   */
  long countByUserIdAndCategoryIdIsNullAndTypeNotAndIsTransferFalseAndIsDuplicateFalse(UUID userId, TransactionType type);

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
          + "WHERE t.userId = :userId AND t.transactionDate BETWEEN :start AND :end"
          + " AND t.isDuplicate = false AND t.status <> 'IGNORED' AND t.isTransfer = false")
  DashboardSummary getDashboardSummary(
      @Param("userId") UUID userId, @Param("start") Instant start, @Param("end") Instant end);

  @Query(
      "SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t "
          + "WHERE t.userId = :userId AND t.categoryId = :categoryId AND t.type = 'DEBIT' "
          + "AND t.transactionDate BETWEEN :start AND :end"
          + " AND t.isDuplicate = false AND t.status <> 'IGNORED' AND t.isTransfer = false")
  BigDecimal sumCategorySpendByPeriod(
      @Param("userId") UUID userId,
      @Param("categoryId") UUID categoryId,
      @Param("start") Instant start,
      @Param("end") Instant end);

  /**
   * Bulk form of {@link #sumCategorySpendByPeriod}: both compared periods for every requested
   * category, in one grouped pass. The per-category endpoint ran two of the query above per
   * category, so a dashboard showing ~20 categories cost ~40 queries across ~20 HTTP requests.
   *
   * <p>The outer BETWEEN spans previousStart..currentEnd - the two periods are contiguous (last
   * month's end butts up against this month's start), so that's one index-friendly range scan on
   * (user_id, transaction_date) and the two conditional sums split it per period.
   *
   * <p>A category with no DEBIT activity in either period produces no row at all, so callers must
   * fill in zeros for the requested ids that come back absent.
   */
  @Query(
      "SELECT new com.lifeos.finance_tracker.domains.record.CategoryPeriodSpend("
          + "  t.categoryId, "
          + "  COALESCE(SUM(CASE WHEN t.transactionDate BETWEEN :currentStart AND :currentEnd "
          + "    THEN t.amount ELSE 0 END), 0), "
          + "  COALESCE(SUM(CASE WHEN t.transactionDate BETWEEN :previousStart AND :previousEnd "
          + "    THEN t.amount ELSE 0 END), 0)"
          + ") "
          + "FROM Transaction t "
          + "WHERE t.userId = :userId AND t.categoryId IN :categoryIds AND t.type = 'DEBIT' "
          + "AND t.transactionDate BETWEEN :previousStart AND :currentEnd "
          + "AND t.isDuplicate = false AND t.status <> 'IGNORED' AND t.isTransfer = false "
          + "GROUP BY t.categoryId")
  List<CategoryPeriodSpend> sumCategorySpendForPeriods(
      @Param("userId") UUID userId,
      @Param("categoryIds") Collection<UUID> categoryIds,
      @Param("currentStart") Instant currentStart,
      @Param("currentEnd") Instant currentEnd,
      @Param("previousStart") Instant previousStart,
      @Param("previousEnd") Instant previousEnd);

  @Query(
      value =
          "SELECT TO_CHAR(DATE_TRUNC('month', transaction_date AT TIME ZONE 'Asia/Kolkata'), 'YYYY-MM') as month, "
              + "COALESCE(SUM(amount), 0) as total_spend "
              + "FROM finance_schema.transactions "
              + "WHERE user_id = :userId AND type = 'DEBIT' "
              + "AND is_duplicate = false AND status <> 'IGNORED' AND is_transfer = false "
              + "AND transaction_date >= :since "
              + "GROUP BY DATE_TRUNC('month', transaction_date AT TIME ZONE 'Asia/Kolkata') "
              + "ORDER BY month DESC",
      nativeQuery = true)
  List<Object[]> getMonthlyTrendsRaw(@Param("userId") UUID userId, @Param("since") Instant since);

  @Query(
      value =
          "SELECT LOWER(TRIM(description)) as merchant, COALESCE(SUM(amount), 0) as total_spend "
              + "FROM finance_schema.transactions "
              + "WHERE user_id = :userId AND type = 'DEBIT' "
              + "AND is_duplicate = false AND status <> 'IGNORED' AND is_transfer = false "
              + "GROUP BY LOWER(TRIM(description)) "
              + "ORDER BY total_spend DESC "
              + "LIMIT :limit",
      nativeQuery = true)
  List<Object[]> getTopMerchantsRaw(@Param("userId") UUID userId, @Param("limit") int limit);

  List<Transaction> findAllByUserIdAndTransactionDateBetweenOrderByTransactionDateAsc(
      UUID userId, Instant start, Instant end);

  /**
   * What an account's counted transactions add up to: money in minus money out, transfers included
   * (they move money between accounts) but duplicates and ignored rows left out. The account's
   * balance is its opening balance plus this, so it can always be recomputed rather than trusted.
   */
  @Query(
      "SELECT COALESCE(SUM(CASE WHEN t.type = 'CREDIT' THEN t.amount "
          + "WHEN t.type = 'DEBIT' THEN -t.amount ELSE 0 END), 0) "
          + "FROM Transaction t WHERE t.accountId = :accountId "
          + "AND t.isDuplicate = false AND t.status <> 'IGNORED'")
  BigDecimal netForAccount(@Param("accountId") UUID accountId);

  /**
   * An email alert already booked this same money movement. A statement row for it carries a
   * different description (the bank's narration vs the UPI payee), so the description-based dedup
   * misses it and the payment would be counted twice.
   */
  @Query(
      "SELECT COUNT(t) > 0 FROM Transaction t WHERE t.accountId = :accountId AND t.amount = :amount "
          + "AND t.type = :type AND t.sourceType = com.lifeos.finance_tracker.domains.enums.SourceType.EMAIL_ALERT "
          + "AND t.isDuplicate = false AND t.transactionDate BETWEEN :from AND :to")
  boolean existsEmailAlertTwin(
      @Param("accountId") UUID accountId,
      @Param("amount") BigDecimal amount,
      @Param("type") TransactionType type,
      @Param("from") Instant from,
      @Param("to") Instant to);

  List<Transaction> findAllByTransferPairId(UUID transferPairId);

  long countByAccountId(UUID accountId);

  /** Money-movement candidates for a transfer: same amount and direction, another account, not already linked. */
  List<Transaction> findAllByUserIdAndAmountAndTypeAndAccountIdNotAndIsTransferFalseAndIsDuplicateFalseAndTransactionDateBetween(
      UUID userId, BigDecimal amount, TransactionType type, UUID excludedAccountId, Instant from, Instant to);

  /** Clears duplicate_of links that point into an account about to be emptied, from other accounts' rows. */
  @org.springframework.data.jpa.repository.Modifying
  @Query(
      "UPDATE Transaction t SET t.duplicateOf = NULL WHERE t.duplicateOf IN "
          + "(SELECT x.id FROM Transaction x WHERE x.accountId = :accountId) AND t.accountId <> :accountId")
  void clearDuplicateLinksInto(@Param("accountId") UUID accountId);

  @org.springframework.data.jpa.repository.Modifying
  @Query("DELETE FROM Transaction t WHERE t.accountId = :accountId")
  int deleteAllByAccountId(@Param("accountId") UUID accountId);

  /** The biggest counted credits since a date, biggest first - how a salary-sized credit is spotted. */
  List<Transaction> findAllByUserIdAndTypeAndTransactionDateAfterAndIsDuplicateFalseAndIsTransferFalseOrderByAmountDesc(
      UUID userId, TransactionType type, Instant after, Pageable pageable);

}
