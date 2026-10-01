package com.lifeos.batches.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.lifeos.batches.domains.enums.GmailPurpose;
import com.lifeos.batches.exception.InvalidOAuthStateException;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;

class OAuthStateStoreTest {

  private final OAuthStateStore store = new OAuthStateStore();

  @Test
  void anIssuedStateReturnsItsPurposeExactlyOnce() {
    String state = store.issue(GmailPurpose.JOBS);

    assertThat(store.consume(state)).contains(GmailPurpose.JOBS);
    assertThat(store.consume(state)).isEmpty();
  }

  @Test
  void guessedBlankAndLegacyPurposeNamesAreRefused() {
    store.issue(GmailPurpose.FINANCE);

    assertThat(store.consume("FINANCE")).isEmpty();
    assertThat(store.consume("")).isEmpty();
    assertThat(store.consume(null)).isEmpty();
    assertThat(store.consume("not-a-real-state")).isEmpty();
  }

  @Test
  void statesAreRandomAndLongEnoughToGuessNever() {
    String a = store.issue(GmailPurpose.FINANCE);
    String b = store.issue(GmailPurpose.FINANCE);

    assertThat(a).isNotEqualTo(b).hasSizeGreaterThanOrEqualTo(40);
  }

  @Test
  void theCallbackRefusesAFlowThatNeverStartedHere() {
    var service = new GmailOAuthService(Mockito.mock(com.lifeos.batches.repository.GmailOAuthRepository.class), Mockito.mock(com.lifeos.common.security.EncryptionService.class), store);
    ReflectionTestUtils.setField(service, "ownerUserId", java.util.UUID.randomUUID().toString());

    assertThatThrownBy(() -> service.handleCallback("attacker-code", "FINANCE")).isInstanceOf(InvalidOAuthStateException.class);
    assertThatThrownBy(() -> service.handleCallback("attacker-code", null)).isInstanceOf(InvalidOAuthStateException.class);
  }
}
