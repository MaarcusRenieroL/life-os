package com.lifeos.finance_tracker.domains.dto.request;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ReconcileAccountRequest {

  // The balance from the bank statement being reconciled against - the service
  // compares this to currentBalance to detect discrepancies (missing/extra
  // transactions), per the spec's reconciliation workflow.
  @NotNull BigDecimal statementBalance;

  @NotNull Instant statementDate;
}
