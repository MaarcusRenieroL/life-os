package com.lifeos.finance_tracker.domains.dto.request;

import jakarta.validation.constraints.NotNull;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateOwnerNamesRequest {

  /** Every spelling the user's name takes in bank narrations, e.g. "MAARCUS RENIERO L". */
  @NotNull List<String> names;
}
