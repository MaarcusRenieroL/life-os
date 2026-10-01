package com.lifeos.finance_tracker.domains.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

/** Money moved between two of the user's own accounts. */
@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateTransferRequest {

  @NotNull UUID fromAccountId;

  @NotNull UUID toAccountId;

  @NotNull
  @DecimalMin(value = "0.01", message = "A transfer must be for more than zero")
  BigDecimal amount;

  @NotNull Instant transactionDate;

  @Size(max = 500)
  String notes;
}
