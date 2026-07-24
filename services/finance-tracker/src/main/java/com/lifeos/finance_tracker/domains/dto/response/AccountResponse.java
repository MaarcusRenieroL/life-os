package com.lifeos.finance_tracker.domains.dto.response;

import com.lifeos.finance_tracker.domains.enums.AccountType;
import com.lifeos.finance_tracker.domains.enums.CurrencyCode;
import java.math.BigDecimal;
import java.time.Instant;
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
public class AccountResponse {

  UUID id;

  String accountName;

  AccountType accountType;

  String bankName;

  // Masked - the service derives this from accountNumberEncrypted (last 4
  // digits only), same convention as CardResponse.lastFourDigits. The raw
  // encrypted value never leaves the service.
  String accountNumberLastFour;

  CurrencyCode currencyCode;

  Instant openedDate;

  BigDecimal currentBalance;

  boolean isActive;

  boolean isPrimary;

  String emailForAlerts;

  String notes;

  Instant createdAt;

  Instant updatedAt;
}
