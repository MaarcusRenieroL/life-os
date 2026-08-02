package com.lifeos.finance_tracker.domains.dto.request;

import com.lifeos.finance_tracker.domains.enums.MatchField;
import com.lifeos.finance_tracker.domains.enums.MatchType;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateCategorizationRuleRequest {

  UUID categoryId;

  MatchType matchType;

  MatchField matchField;

  String matchValue;

  Integer priority;

  Boolean isActive;
}
