package com.lifeos.finance_tracker.domains.dto.request;

import com.lifeos.finance_tracker.domains.enums.TransactionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

// Unlike CreateEmailAlertTransactionRequest, the account is already known at
// upload time (the user picks which account they're importing a statement
// for) - no bankName/accountType lookup needed here.
@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateCsvImportTransactionRequest {

  // No JWT principal on an internal call - travels in the body, same as
  // CreateEmailAlertTransactionRequest.
  @NotNull UUID userId;

  @NotNull UUID accountId;

  @NotNull Instant transactionDate;

  @NotBlank
  @Size(max = 200)
  String description;

  @NotNull @Positive BigDecimal amount;

  @NotNull TransactionType type;
}
