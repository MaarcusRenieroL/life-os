package com.lifeos.finance_tracker.domains.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdatePayCycleRequest {

  @Min(1)
  @Max(28)
  int startDay;
}
