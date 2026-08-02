package com.lifeos.finance_tracker.domains.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateMonthlyIncomeRequest {

  @NotNull
  @PositiveOrZero
  BigDecimal monthlyIncome;
}
