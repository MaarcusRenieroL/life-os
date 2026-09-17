package com.lifeos.finance_tracker.domains.dto.request;

import com.lifeos.finance_tracker.domains.enums.AccountType;
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

// No @Builder here - unlike every other request DTO, this one used to have
// it, but nothing in finance-tracker actually builds this object (only
// deserializes it from the internal endpoint's request body). @Builder
// generates an all-args constructor, which suppresses Java's implicit no-args
// one - and without a no-args constructor, Jackson has nothing to instantiate
// with, so every incoming request failed with "no Creators, like default
// constructor, exist".
@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateEmailAlertTransactionRequest {

  @NotNull UUID userId;

  @NotBlank String bankName;

  @NotNull AccountType accountType;

  @NotNull Instant transactionDate;

  @NotBlank
  @Size(max = 200)
  String description;

  @NotNull @Positive BigDecimal amount;

  @NotNull TransactionType type;

  @NotBlank String sourceReference;
}
