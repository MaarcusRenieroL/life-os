package com.lifeos.tasks.domains.dto.request;

import com.lifeos.tasks.domains.enums.TimeEntryType;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class StartTimeEntryRequest {

  @NotNull TimeEntryType type;

  UUID taskId;
}
