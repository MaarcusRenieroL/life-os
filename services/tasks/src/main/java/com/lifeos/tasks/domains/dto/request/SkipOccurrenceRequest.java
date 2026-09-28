package com.lifeos.tasks.domains.dto.request;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SkipOccurrenceRequest {

  @NotNull LocalDate dueDate;
}
