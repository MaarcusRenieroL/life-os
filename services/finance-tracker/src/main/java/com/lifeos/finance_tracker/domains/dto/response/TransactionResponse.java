package com.lifeos.finance_tracker.domains.dto.response;

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

  List<String> tags;

  String notes;

  String receiptUrl;

  String disputeReason;

  Instant disputeDate;

  boolean isRecurring;

  SourceType sourceType;

  String sourceReference;

  boolean isReconciled;

  boolean isDuplicate;

  UUID duplicateOf;

  TransactionStatus status;

  Instant importedAt;

  Instant createdAt;

  Instant updatedAt;
}
