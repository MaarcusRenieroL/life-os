package com.lifeos.finance_tracker.domains.dto.response;

import com.lifeos.finance_tracker.domains.enums.BudgetPeriod;
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
public class BudgetResponse {

  UUID id;

  UUID categoryId;

  BigDecimal budgetAmount;

  BudgetPeriod period;

  Instant startDate;

  Instant endDate;

  int alertThreshold;

  boolean alertEnabled;

  String notes;

  Instant createdAt;

  Instant updatedAt;
}
