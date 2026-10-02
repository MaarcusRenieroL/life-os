package com.lifeos.finance_tracker.domains.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdatePayCycleRequest {

  /** 1-28, or 0 for the last working day of the month. */
  @Min(0)
  @Max(28)
  int startDay;
}
