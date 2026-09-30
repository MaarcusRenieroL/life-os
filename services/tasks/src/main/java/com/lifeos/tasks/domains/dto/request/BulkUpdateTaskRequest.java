package com.lifeos.tasks.domains.dto.request;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

// Applies `patch` (the same partial-update semantics as UpdateTaskRequest) to every id in `ids`
// that the caller owns; ids that don't resolve to an owned task are silently skipped rather than
// failing the whole batch, since a stale id in a bulk-selected UI list shouldn't block the rest.
@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BulkUpdateTaskRequest {

  @NotEmpty List<UUID> ids;

  UpdateTaskRequest patch;
}
