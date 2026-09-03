package com.lifeos.finance_tracker.domains.dto.request;

import com.lifeos.finance_tracker.domains.enums.MatchField;
import com.lifeos.finance_tracker.domains.enums.MatchType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateCategorizationRuleRequest {

  @NotNull UUID categoryId;

  @NotNull MatchType matchType;

  @NotNull MatchField matchField;

  @NotBlank String matchValue;

  int priority;
}
