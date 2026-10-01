package com.lifeos.common.events;

import java.time.Instant;
import java.util.UUID;

/** Published by batches' Gmail job-search poller to the {@code job-email-events} topic, one per
 * candidate email; job-tracker consumes it and runs the actual AI classification. Kept as a raw
 * shared record (like {@link AuditEventRecord}) rather than a service-specific DTO so the producer
 * (batches) and consumer (job-tracker) deserialize the exact same shape. */
public record JobEmailEventRecord(
    UUID userId,
    String gmailMessageId,
    String fromAddress,
    String subject,
    String body,
    /** When Gmail received it - the application date for a confirmation. Null on events published
     * before this field existed. */
    Instant receivedAt) {}
