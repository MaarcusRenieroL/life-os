package com.lifeos.finance_tracker.domains.dto.response;

import com.lifeos.finance_tracker.domains.enums.RecurringFrequency;
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
public class RecurringPatternResponse {

  UUID id;

  UUID merchantId;

  UUID categoryId;

  BigDecimal averageAmount;

  RecurringFrequency frequency;

  int expectedDayOfCycle;

  Instant lastTransactionDate;

  Instant nextExpectedDate;

  BigDecimal variance;

  BigDecimal confidenceScore;

  Instant lastDetectedAt;

  Instant createdAt;
}
