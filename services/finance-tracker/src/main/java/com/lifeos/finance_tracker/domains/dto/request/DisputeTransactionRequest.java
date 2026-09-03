package com.lifeos.finance_tracker.domains.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DisputeTransactionRequest {

  @NotBlank
  @Size(max = 200)
  String reason;
}
