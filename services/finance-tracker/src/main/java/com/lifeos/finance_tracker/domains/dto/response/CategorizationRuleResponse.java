package com.lifeos.finance_tracker.domains.dto.response;

import com.lifeos.finance_tracker.domains.enums.MatchField;
import com.lifeos.finance_tracker.domains.enums.MatchType;
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
public class CategorizationRuleResponse {

  UUID id;

  UUID categoryId;

  MatchType matchType;

  MatchField matchField;

  String matchValue;

  int priority;

  boolean isActive;

  int hitCount;

  Instant createdAt;

  Instant updatedAt;
}
