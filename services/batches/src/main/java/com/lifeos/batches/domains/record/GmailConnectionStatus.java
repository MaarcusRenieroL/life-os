package com.lifeos.batches.domains.record;

import java.time.Instant;

public record GmailConnectionStatus(boolean connected, Instant connectedAt, Instant lastRefreshedAt) {}
