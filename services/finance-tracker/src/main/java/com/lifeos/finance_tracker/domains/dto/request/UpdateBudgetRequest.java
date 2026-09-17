package com.lifeos.finance_tracker.domains.dto.request;

import com.lifeos.finance_tracker.domains.enums.BudgetPeriod;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateBudgetRequest {

  UUID categoryId;

  @Positive BigDecimal budgetAmount;

  BudgetPeriod period;

  Instant startDate;

  Instant endDate;

  @Min(0)
  @Max(100)
  Integer alertThreshold;

  Boolean alertEnabled;

  @Size(max = 500)
  String notes;
}
