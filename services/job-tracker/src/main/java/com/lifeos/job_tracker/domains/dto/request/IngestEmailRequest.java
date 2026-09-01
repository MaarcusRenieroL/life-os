package com.lifeos.job_tracker.domains.dto.request;

import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;

/** Payload from the Gmail connector / MCP bridge for one inbound message. */
public record IngestEmailRequest(
    @NotNull UUID userId,
    @NotNull String externalMessageId,
    String threadId,
    String fromAddress,
    String toAddress,
    String subject,
    String body,
    Instant receivedAt) {}
