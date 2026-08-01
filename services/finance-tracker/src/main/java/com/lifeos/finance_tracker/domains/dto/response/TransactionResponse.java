package com.lifeos.finance_tracker.domains.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.lifeos.finance_tracker.domains.enums.SourceType;
import com.lifeos.finance_tracker.domains.enums.TransactionStatus;
import com.lifeos.finance_tracker.domains.enums.TransactionType;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TransactionResponse {

  UUID id;

  UUID accountId;

  Instant transactionDate;

  String description;

  BigDecimal amount;

  TransactionType type;

  UUID categoryId;

  boolean categoryManuallySet;

  // All categories assigned to this transaction - see TransactionCategory. The
  // primary categoryId above mirrors categoryIds[0] for features (budgets,
  // rowStatus, rule learning) that only understand a single category.
  List<UUID> categoryIds;

  String notes;

  String receiptUrl;

  String disputeReason;

  Instant disputeDate;

  @JsonProperty("isRecurring")
  boolean isRecurring;

  SourceType sourceType;

  String sourceReference;

  @JsonProperty("isReconciled")
  boolean isReconciled;

  @JsonProperty("isDuplicate")
  boolean isDuplicate;

  UUID duplicateOf;

  TransactionStatus status;

  Instant importedAt;

  Instant createdAt;

  Instant updatedAt;
}
