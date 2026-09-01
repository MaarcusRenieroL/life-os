package com.lifeos.job_tracker.domains.dto.request;

import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

public record IngestJobsRequest(@NotNull UUID userId, List<ScrapedJob> jobs) {}
