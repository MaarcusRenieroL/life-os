package com.lifeos.batches.domains.record;

import java.time.Instant;

/** {@code email} is the mailbox the tokens belong to (null if Google can't be reached right now). */
public record GmailConnectionStatus(
    boolean connected, Instant connectedAt, Instant lastRefreshedAt, String email) {}
