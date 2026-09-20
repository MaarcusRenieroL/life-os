package com.lifeos.finance_tracker.domains.dto.request;

import com.lifeos.finance_tracker.domains.enums.TransactionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

// Backs core's quick-capture flow (POST /v1/finance/internal/quick-transaction) - core's AI
// classifier turns a free-text line like "spent 400 on groceries" into
// {description, amount, type} and calls this internal endpoint with an explicit userId, the same
// no-JWT-context pattern as the other internal controllers (see InternalTodayController). There's
// no accountId here since free text carries no account context - TransactionService resolves a
// default account itself (see createFromQuickCapture).
@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateQuickCaptureTransactionRequest {

  @NotNull UUID userId;

  @NotBlank
  @Size(max = 200)
  String description;

  @NotNull @Positive BigDecimal amount;

  @NotNull TransactionType type;
}
