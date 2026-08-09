package com.lifeos.job_tracker.domains.dto.request;

import com.lifeos.job_tracker.domains.enums.ApplicationStage;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BulkStageUpdateRequest {

  @NotEmpty List<UUID> applicationIds;

  @NotNull ApplicationStage stage;
}
