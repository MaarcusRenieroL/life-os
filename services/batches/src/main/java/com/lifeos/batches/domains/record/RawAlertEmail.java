package com.lifeos.batches.domains.record;

import java.time.Instant;

public record RawAlertEmail(
    String messageId, String fromAddress, String subject, String body, Instant receivedAt) {}
