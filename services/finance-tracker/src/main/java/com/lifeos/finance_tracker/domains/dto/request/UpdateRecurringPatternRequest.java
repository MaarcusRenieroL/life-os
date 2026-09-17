package com.lifeos.finance_tracker.domains.dto.request;

import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

// Recurring patterns are system-detected, not user-created - the only thing
// a user can correct here is a mis-assigned category.
@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateRecurringPatternRequest {

  UUID categoryId;
}
