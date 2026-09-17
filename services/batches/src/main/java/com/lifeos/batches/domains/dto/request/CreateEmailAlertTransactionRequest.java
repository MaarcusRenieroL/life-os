package com.lifeos.batches.domains.dto.request;

import com.lifeos.batches.domains.enums.AccountType;
import com.lifeos.batches.domains.enums.TransactionType;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateEmailAlertTransactionRequest {

  UUID userId;

  String bankName;

  AccountType accountType;

  Instant transactionDate;

  String description;

  BigDecimal amount;

  TransactionType type;

  String sourceReference;
}
