package com.lifeos.finance_tracker.domains.dto.request;

import com.lifeos.finance_tracker.domains.enums.TransactionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

// For manual entry only (POST /api/transactions) - the service sets
// sourceType=MANUAL_ENTRY itself, so it isn't a field here. Email-alert and
// CSV-import transactions are created internally, not through this DTO.
@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateTransactionRequest {

  @NotNull UUID accountId;

  @NotNull Instant transactionDate;

  @NotBlank
  @Size(max = 200)
  String description;

  @NotNull
  @Positive
  BigDecimal amount;

  @NotNull TransactionType type;

  List<String> tags;

  @Size(max = 500)
  String notes;

  String receiptUrl;
}
