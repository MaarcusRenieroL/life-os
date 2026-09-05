package com.lifeos.job_tracker.domains.dto.request;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import java.util.UUID;

public record ReorderSectionsRequest(@NotEmpty List<UUID> sectionOrder) {}
