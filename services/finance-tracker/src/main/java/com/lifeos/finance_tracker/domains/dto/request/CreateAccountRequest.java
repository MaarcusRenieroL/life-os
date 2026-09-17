package com.lifeos.finance_tracker.domains.dto.request;

import com.lifeos.finance_tracker.domains.enums.AccountType;
import com.lifeos.finance_tracker.domains.enums.CurrencyCode;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateAccountRequest {

  @NotBlank
  @Size(max = 100)
  String accountName;

  @NotNull AccountType accountType;

  @Size(max = 100)
  String bankName;

  // Raw account number - the service encrypts this before persisting into
  // accountNumberEncrypted, same pattern as CardService encrypting cardNumber.
  @NotBlank
  @Size(max = 50)
  String accountNumber;

  @NotNull CurrencyCode currencyCode;

  Instant openedDate;

  BigDecimal currentBalance;

  boolean isPrimary;

  @Email
  @Size(max = 255)
  String emailForAlerts;

  @Size(max = 500)
  String notes;
}
