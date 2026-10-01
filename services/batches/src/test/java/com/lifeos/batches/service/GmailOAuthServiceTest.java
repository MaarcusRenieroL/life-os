package com.lifeos.batches.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.lifeos.batches.domains.entity.GmailOAuthToken;
import com.lifeos.batches.domains.enums.GmailPurpose;
import com.lifeos.batches.repository.GmailOAuthRepository;
import com.lifeos.common.security.EncryptionService;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class GmailOAuthServiceTest {

  private final UUID owner = UUID.randomUUID();
  private final GmailOAuthRepository repository = mock(GmailOAuthRepository.class);
  private final EncryptionService encryption = mock(EncryptionService.class);
  private GmailOAuthService service;

  @BeforeEach
  void setUp() {
    service = new GmailOAuthService(repository, encryption);
    ReflectionTestUtils.setField(service, "ownerUserId", owner.toString());
    lenient().when(encryption.decrypt(any())).thenAnswer(call -> "plain-" + call.getArgument(0));
  }

  private GmailOAuthToken token(GmailPurpose purpose, String accessToken) {
    return GmailOAuthToken.builder()
        .userId(owner)
        .purpose(purpose)
        .email(purpose.name().toLowerCase() + "@example.com")
        .accessTokenEncrypted(accessToken)
        .expiresAt(Instant.now().plusSeconds(3600))
        .build();
  }

  @Test
  void eachPurposeUsesItsOwnMailbox() {
    when(repository.findByUserIdAndPurpose(owner, GmailPurpose.JOBS)).thenReturn(Optional.of(token(GmailPurpose.JOBS, "jobs-token")));
    when(repository.findByUserIdAndPurpose(owner, GmailPurpose.FINANCE)).thenReturn(Optional.of(token(GmailPurpose.FINANCE, "fin-token")));

    assertThat(service.getValidAccessToken(GmailPurpose.JOBS)).isEqualTo("plain-jobs-token");
    assertThat(service.getValidAccessToken(GmailPurpose.FINANCE)).isEqualTo("plain-fin-token");
  }

  @Test
  void aSingleConnectedMailboxServesEveryPurpose() {
    GmailOAuthToken only = token(GmailPurpose.FINANCE, "only-token");
    when(repository.findByUserIdAndPurpose(eq(owner), any())).thenReturn(Optional.empty());
    when(repository.findAllByUserId(owner)).thenReturn(List.of(only));

    assertThat(service.getValidAccessToken(GmailPurpose.JOBS)).isEqualTo("plain-only-token");
  }

  @Test
  void noMailboxAtAllIsAClearError() {
    when(repository.findByUserIdAndPurpose(eq(owner), any())).thenReturn(Optional.empty());
    when(repository.findAllByUserId(owner)).thenReturn(List.of());

    assertThatThrownBy(() -> service.getValidAccessToken(GmailPurpose.JOBS))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("not connected");
  }

  @Test
  void statusListsEveryMailboxAndReportsFinanceAsPrimary() {
    when(repository.findAllByUserId(owner))
        .thenReturn(List.of(token(GmailPurpose.JOBS, "j"), token(GmailPurpose.FINANCE, "f")));

    var status = service.getStatus();

    assertThat(status.connected()).isTrue();
    assertThat(status.email()).isEqualTo("finance@example.com");
    assertThat(status.mailboxes()).extracting(m -> m.purpose()).containsExactlyInAnyOrder("JOBS", "FINANCE");
  }

  @Test
  void connectedPurposesFollowTheStoredRows() {
    when(repository.findAllByUserId(owner)).thenReturn(List.of(token(GmailPurpose.JOBS, "j")));

    assertThat(service.connectedPurposes()).containsExactly(GmailPurpose.JOBS);
  }
}
