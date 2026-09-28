package com.lifeos.calendar.domains.dto.request;

import com.lifeos.calendar.domains.enums.EventRecurrencePattern;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.Map;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SetRecurrenceRequest {

  @NotNull EventRecurrencePattern pattern;

  Map<String, Object> config;

  LocalDate endDate;
}
