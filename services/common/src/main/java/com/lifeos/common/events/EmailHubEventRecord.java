package com.lifeos.common.events;

import java.time.Instant;
import java.util.UUID;

/** Published by batches' inbox poller to the {@code email-hub-events} topic, one per candidate
 * email; core consumes it, classifies it and routes it to whichever module it belongs to. The body
 * is truncated by the producer and is never stored by the consumer - only a short snippet is. */
public record EmailHubEventRecord(
    UUID userId,
    String gmailMessageId,
    String threadId,
    String fromAddress,
    String subject,
    String body,
    Instant receivedAt) {}
