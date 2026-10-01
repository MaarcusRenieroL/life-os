package com.lifeos.vault.service;

import com.lifeos.vault.exception.TooManyAttemptsException;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/**
 * Slows down guessing of the master password and recovery codes. After {@value #FREE_ATTEMPTS} wrong tries in a
 * row the account is locked out, for 1 minute at first and doubling each further failure up to an hour. A
 * correct answer clears the count. Held in memory: a restart forgives, which is acceptable for one owner, and
 * the cost of a guess (PBKDF2 plus BCrypt) is already high.
 */
@Component
public class UnlockAttemptLimiter {

  static final int FREE_ATTEMPTS = 5;
  private static final Duration MAX_LOCKOUT = Duration.ofHours(1);

  private record State(int failures, Instant lockedUntil) {}

  private final ConcurrentHashMap<UUID, State> states = new ConcurrentHashMap<>();

  /** Throws if the user is currently locked out. Call before checking the secret. */
  public void checkAllowed(UUID userId) {
    State state = states.get(userId);
    if (state != null && state.lockedUntil() != null && state.lockedUntil().isAfter(Instant.now())) {
      throw new TooManyAttemptsException(Duration.between(Instant.now(), state.lockedUntil()).getSeconds());
    }
  }

  public void recordFailure(UUID userId) {
    states.compute(
        userId,
        (id, old) -> {
          int failures = old == null ? 1 : old.failures() + 1;
          if (failures < FREE_ATTEMPTS) {
            return new State(failures, null);
          }
          long seconds = Math.min(MAX_LOCKOUT.getSeconds(), 60L << Math.min(failures - FREE_ATTEMPTS, 6));
          return new State(failures, Instant.now().plusSeconds(seconds));
        });
  }

  public void recordSuccess(UUID userId) {
    states.remove(userId);
  }
}
