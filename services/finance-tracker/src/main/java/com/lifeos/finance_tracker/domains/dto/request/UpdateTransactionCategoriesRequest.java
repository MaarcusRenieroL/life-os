package com.lifeos.finance_tracker.domains.dto.request;

import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateTransactionCategoriesRequest {

  // Full replacement list - pass an empty list to clear all tags.
  @NotNull List<UUID> categoryIds;
}
