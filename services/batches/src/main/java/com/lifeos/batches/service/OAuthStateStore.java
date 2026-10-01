package com.lifeos.batches.service;

import com.lifeos.batches.domains.enums.GmailPurpose;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/**
 * The OAuth {@code state} that ties a Google consent screen to the signed-in person who started it. A
 * random single-use value, kept in memory for ten minutes. Without it the callback (which Google reaches
 * without a login) would accept any authorization code, so anyone could connect their own mailbox to this
 * account by walking through the consent screen and landing on the callback.
 */
@Component
public class OAuthStateStore {

  private static final Duration TTL = Duration.ofMinutes(10);
  private static final int MAX_PENDING = 100;

  private record Pending(GmailPurpose purpose, Instant expiresAt) {}

  private final SecureRandom random = new SecureRandom();
  private final ConcurrentHashMap<String, Pending> pending = new ConcurrentHashMap<>();

  /** A fresh state value for a consent flow about to start. */
  public String issue(GmailPurpose purpose) {
    Instant now = Instant.now();
    pending.values().removeIf(p -> p.expiresAt().isBefore(now));
    if (pending.size() >= MAX_PENDING) {
      pending.clear();
    }
    byte[] bytes = new byte[32];
    random.nextBytes(bytes);
    String state = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    pending.put(state, new Pending(purpose, now.plus(TTL)));
    return state;
  }

  /** The purpose this state was issued for, once; empty for an unknown, expired or already-used value. */
  public Optional<GmailPurpose> consume(String state) {
    if (state == null || state.isBlank()) {
      return Optional.empty();
    }
    Pending found = pending.remove(state);
    if (found == null || found.expiresAt().isBefore(Instant.now())) {
      return Optional.empty();
    }
    return Optional.of(found.purpose());
  }
}
