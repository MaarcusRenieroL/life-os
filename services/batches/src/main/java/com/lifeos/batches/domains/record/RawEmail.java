package com.lifeos.batches.domains.record;

import java.time.Instant;

/**
 * A fetched Gmail message, generic across every consumer of {@code GmailMessageService} (bank
 * alerts, job-search emails, ...). {@link RawAlertEmail} is the finance-specific subset kept as-is
 * so the existing bank-alert pipeline didn't need touching.
 */
public record RawEmail(
    String messageId,
    String threadId,
    String fromAddress,
    String toAddress,
    String subject,
    String body,
    Instant receivedAt) {}
