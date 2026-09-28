package com.lifeos.tasks.domains.dto.request;

import com.lifeos.tasks.domains.enums.TaskRecurrencePattern;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.Map;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SetRecurrenceRequest {

  @NotNull TaskRecurrencePattern pattern;

  Map<String, Object> config;

  LocalDate endDate;
}
