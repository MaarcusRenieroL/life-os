package com.lifeos.finance_tracker.domains.dto.request;

import com.lifeos.finance_tracker.domains.enums.AccountType;
import com.lifeos.finance_tracker.domains.enums.CurrencyCode;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateAccountRequest {

  @Size(max = 100)
  String accountName;

  AccountType accountType;

  @Size(max = 100)
  String bankName;

  // Optional, same convention as UpdateCardRequest.cardNumber - only
  // re-encrypted when the caller actually sends a new value.
  @Size(max = 50)
  String accountNumber;

  CurrencyCode currencyCode;

  Instant openedDate;

  BigDecimal currentBalance;

  Boolean isActive;

  Boolean isPrimary;

  @Email
  @Size(max = 255)
  String emailForAlerts;

  @Size(max = 500)
  String notes;
}
