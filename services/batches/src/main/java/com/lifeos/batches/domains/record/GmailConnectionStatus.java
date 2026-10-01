package com.lifeos.batches.domains.record;

import java.time.Instant;
import java.util.List;

/**
 * {@code connected}, {@code connectedAt}, {@code lastRefreshedAt} and {@code email} describe the
 * finance mailbox (kept for older clients); {@code mailboxes} lists every connected mailbox.
 */
public record GmailConnectionStatus(
    boolean connected,
    Instant connectedAt,
    Instant lastRefreshedAt,
    String email,
    List<Mailbox> mailboxes) {

  public record Mailbox(String purpose, String email, Instant connectedAt, Instant lastRefreshedAt) {}
}
