package com.lifeos.vault;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.lifeos.vault.exception.TooManyAttemptsException;
import com.lifeos.vault.service.UnlockAttemptLimiter;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class UnlockAttemptLimiterTest {

  private final UnlockAttemptLimiter limiter = new UnlockAttemptLimiter();
  private final UUID user = UUID.randomUUID();

  @Test
  void fourWrongAnswersAreStillAllowedButTheFifthLocksTheAccountOut() {
    for (int i = 0; i < 4; i++) {
      limiter.checkAllowed(user);
      limiter.recordFailure(user);
    }
    assertThatCode(() -> limiter.checkAllowed(user)).doesNotThrowAnyException();

    limiter.recordFailure(user);

    assertThatThrownBy(() -> limiter.checkAllowed(user)).isInstanceOf(TooManyAttemptsException.class);
  }

  @Test
  void aCorrectAnswerClearsTheCount() {
    for (int i = 0; i < 4; i++) limiter.recordFailure(user);
    limiter.recordSuccess(user);
    for (int i = 0; i < 4; i++) limiter.recordFailure(user);

    assertThatCode(() -> limiter.checkAllowed(user)).doesNotThrowAnyException();
  }

  @Test
  void lockoutsAreIndependentPerUser() {
    for (int i = 0; i < 5; i++) limiter.recordFailure(user);

    assertThatCode(() -> limiter.checkAllowed(UUID.randomUUID())).doesNotThrowAnyException();
  }
}
