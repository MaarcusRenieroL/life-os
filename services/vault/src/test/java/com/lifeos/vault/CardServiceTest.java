package com.lifeos.vault;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.lifeos.common.events.AuditEventPublisher;
import com.lifeos.common.events.AuditEventType;
import com.lifeos.vault.domains.dto.request.CreateCardRequest;
import com.lifeos.vault.domains.dto.request.UpdateCardRequest;
import com.lifeos.vault.domains.dto.response.CardResponse;
import com.lifeos.vault.domains.entity.PaymentCard;
import com.lifeos.vault.domains.enums.NetworkType;
import com.lifeos.vault.domains.record.VaultKeyRecord;
import com.lifeos.vault.exception.PaymentCardNotFoundException;
import com.lifeos.vault.exception.VaultLockedException;
import com.lifeos.vault.repository.PaymentCardRepository;
import com.lifeos.vault.service.CardService;
import com.lifeos.vault.service.EncryptionService;
import com.lifeos.vault.service.EncryptionService.EncryptedData;
import com.lifeos.vault.store.VaultKeyStore;
import java.lang.reflect.Field;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;

@ExtendWith(MockitoExtension.class)
class CardServiceTest {

  @Mock private PaymentCardRepository paymentCardRepository;
  @Mock private VaultKeyStore vaultKeyStore;
  @Mock private EncryptionService encryptionService;
  @Mock private AuditEventPublisher auditEventPublisher;
  @Mock private Authentication authentication;

  @InjectMocks private CardService cardService;

  private final UUID userA = UUID.randomUUID();
  private final UUID userB = UUID.randomUUID();
  private final SecretKey key = mock(SecretKey.class);

  @BeforeEach
  void unlockVaultForUserA() {
    lenient().when(authentication.getPrincipal()).thenReturn(userA);
    lenient()
        .when(vaultKeyStore.get(userA))
        .thenReturn(new VaultKeyRecord(key, Instant.now().plusSeconds(900)));
  }

  @Test
  void getCardsIsScopedToTheAuthenticatedUserOnly() {
    PaymentCard cardForUserA =
        PaymentCard.builder()
            .id(UUID.randomUUID())
            .userId(userA)
            .nickname("A's Visa")
            .network(NetworkType.VISA)
            .lastFourDigits(1111)
            .expiryEncrypted("expEnc")
            .expiryIv("expIv")
            .build();

    when(paymentCardRepository.findAllByUserId(userA)).thenReturn(List.of(cardForUserA));
    when(encryptionService.decrypt("expEnc", "expIv", key)).thenReturn("09/28");

    List<CardResponse> result = cardService.getCards(authentication);

    assertThat(result).hasSize(1);
    assertThat(result.get(0).getNickname()).isEqualTo("A's Visa");
    verify(paymentCardRepository).findAllByUserId(userA);
    verify(paymentCardRepository, never()).findAllByUserId(userB);
  }

  @Test
  void getCardsThrowsWhenVaultIsLocked() {
    when(vaultKeyStore.get(userA)).thenReturn(null);

    assertThatThrownBy(() -> cardService.getCards(authentication))
        .isInstanceOf(VaultLockedException.class);

    verify(paymentCardRepository, never()).findAllByUserId(any());
  }

  @Test
  void getCardReturnsOwnCard() {
    UUID cardId = UUID.randomUUID();
    PaymentCard card =
        PaymentCard.builder()
            .id(cardId)
            .userId(userA)
            .nickname("A's Amex")
            .network(NetworkType.AMEX)
            .lastFourDigits(4242)
            .expiryEncrypted("expEnc")
            .expiryIv("expIv")
            .build();

    when(paymentCardRepository.findByIdAndUserId(cardId, userA)).thenReturn(Optional.of(card));
    when(encryptionService.decrypt("expEnc", "expIv", key)).thenReturn("12/29");

    CardResponse response = cardService.getCard(authentication, cardId);

    assertThat(response.getId()).isEqualTo(cardId);
    assertThat(response.getExpiry()).isEqualTo("12/29");
  }

  @Test
  void getCardBelongingToAnotherUserIsNotFound() {
    UUID cardBelongingToUserB = UUID.randomUUID();

    // Repository is scoped by (id, userId): a card owned by userB never matches
    // when looked up under userA's id, so it comes back empty - not the card.
    when(paymentCardRepository.findByIdAndUserId(cardBelongingToUserB, userA))
        .thenReturn(Optional.empty());

    assertThatThrownBy(() -> cardService.getCard(authentication, cardBelongingToUserB))
        .isInstanceOf(PaymentCardNotFoundException.class);
  }

  @Test
  void createCardEncryptsSensitiveFieldsBeforePersistingAndPublishesAudit() {
    CreateCardRequest request = new CreateCardRequest();
    setField(request, "nickname", "Personal Visa");
    setField(request, "network", NetworkType.VISA);
    setField(request, "cardNumber", "4111111111111111");
    setField(request, "cvv", "123");
    setField(request, "expiry", "09/28");
    setField(request, "cardHolderName", "Maarcus Reniero");
    setField(request, "billingZip", "12345");

    when(encryptionService.encrypt("4111111111111111", key))
        .thenReturn(new EncryptedData("numCt", "numIv"));
    when(encryptionService.encrypt("123", key)).thenReturn(new EncryptedData("cvvCt", "cvvIv"));
    when(encryptionService.encrypt("09/28", key)).thenReturn(new EncryptedData("expCt", "expIv"));
    when(encryptionService.decrypt("expCt", "expIv", key)).thenReturn("09/28");

    when(paymentCardRepository.save(any(PaymentCard.class)))
        .thenAnswer(
            invocation -> {
              PaymentCard saved = invocation.getArgument(0);
              saved.setId(UUID.randomUUID());
              return saved;
            });

    CardResponse response = cardService.createCard(authentication, request);

    ArgumentCaptor<PaymentCard> captor = ArgumentCaptor.forClass(PaymentCard.class);
    verify(paymentCardRepository).save(captor.capture());
    PaymentCard persisted = captor.getValue();

    assertThat(persisted.getUserId()).isEqualTo(userA);
    assertThat(persisted.getLastFourDigits()).isEqualTo(1111);
    assertThat(persisted.getCardNumberEncrypted()).isEqualTo("numCt");
    assertThat(persisted.getCardNumberIv()).isEqualTo("numIv");
    assertThat(persisted.getCvvEncrypted()).isEqualTo("cvvCt");
    assertThat(persisted.getExpiryEncrypted()).isEqualTo("expCt");
    // Plaintext must never be persisted as-is.
    assertThat(persisted.getCardNumberEncrypted()).isNotEqualTo("4111111111111111");
    assertThat(persisted.getCvvEncrypted()).isNotEqualTo("123");

    assertThat(response.getLastFourDigits()).isEqualTo(1111);
    assertThat(response.getExpiry()).isEqualTo("09/28");

    verify(auditEventPublisher)
        .publish(eq(userA), eq(AuditEventType.CARD_ADDED), anyString(), anyMap());
  }

  @Test
  void updateCardOnlyReEncryptsFieldsThatWereActuallySent() {
    UUID cardId = UUID.randomUUID();
    PaymentCard existing =
        PaymentCard.builder()
            .id(cardId)
            .userId(userA)
            .nickname("Old nickname")
            .network(NetworkType.MASTERCARD)
            .lastFourDigits(9999)
            .cardNumberEncrypted("oldNumCt")
            .cardNumberIv("oldNumIv")
            .cvvEncrypted("oldCvvCt")
            .cvvIv("oldCvvIv")
            .expiryEncrypted("oldExpCt")
            .expiryIv("oldExpIv")
            .build();

    when(paymentCardRepository.findByIdAndUserId(cardId, userA)).thenReturn(Optional.of(existing));
    when(paymentCardRepository.save(existing)).thenReturn(existing);
    when(encryptionService.decrypt("oldExpCt", "oldExpIv", key)).thenReturn("01/27");

    UpdateCardRequest request = new UpdateCardRequest();
    setField(request, "nickname", "New nickname");
    setField(request, "network", NetworkType.MASTERCARD);
    // cardNumber/cvv/expiry deliberately left null - caller only wants to rename the card.

    CardResponse response = cardService.updateCard(authentication, cardId, request);

    assertThat(response.getNickname()).isEqualTo("New nickname");
    assertThat(existing.getCardNumberEncrypted()).isEqualTo("oldNumCt");
    assertThat(existing.getCvvEncrypted()).isEqualTo("oldCvvCt");
    assertThat(existing.getLastFourDigits()).isEqualTo(9999);

    verify(encryptionService, never()).encrypt(anyString(), eq(key));
  }

  @Test
  void updateCardReEncryptsCardNumberWhenANewOneIsProvided() {
    UUID cardId = UUID.randomUUID();
    PaymentCard existing =
        PaymentCard.builder()
            .id(cardId)
            .userId(userA)
            .network(NetworkType.VISA)
            .lastFourDigits(9999)
            .cardNumberEncrypted("oldNumCt")
            .cardNumberIv("oldNumIv")
            .expiryEncrypted("expCt")
            .expiryIv("expIv")
            .build();

    when(paymentCardRepository.findByIdAndUserId(cardId, userA)).thenReturn(Optional.of(existing));
    when(paymentCardRepository.save(existing)).thenReturn(existing);
    when(encryptionService.encrypt("4000000000000002", key))
        .thenReturn(new EncryptedData("newNumCt", "newNumIv"));
    when(encryptionService.decrypt("expCt", "expIv", key)).thenReturn("01/27");

    UpdateCardRequest request = new UpdateCardRequest();
    setField(request, "network", NetworkType.VISA);
    setField(request, "cardNumber", "4000000000000002");

    cardService.updateCard(authentication, cardId, request);

    assertThat(existing.getCardNumberEncrypted()).isEqualTo("newNumCt");
    assertThat(existing.getLastFourDigits()).isEqualTo(2);
  }

  @Test
  void updateCardBelongingToAnotherUserThrowsAndNeverSaves() {
    UUID cardBelongingToUserB = UUID.randomUUID();
    when(paymentCardRepository.findByIdAndUserId(cardBelongingToUserB, userA))
        .thenReturn(Optional.empty());

    UpdateCardRequest request = new UpdateCardRequest();
    setField(request, "network", NetworkType.VISA);

    assertThatThrownBy(() -> cardService.updateCard(authentication, cardBelongingToUserB, request))
        .isInstanceOf(PaymentCardNotFoundException.class);

    verify(paymentCardRepository, never()).save(any());
  }

  @Test
  void deleteCardRemovesOwnCardAndPublishesAudit() {
    UUID cardId = UUID.randomUUID();
    PaymentCard card =
        PaymentCard.builder().id(cardId).userId(userA).nickname("Doomed card").build();

    when(paymentCardRepository.findByIdAndUserId(cardId, userA)).thenReturn(Optional.of(card));

    cardService.deleteCard(authentication, cardId);

    verify(paymentCardRepository).deleteByIdAndUserId(cardId, userA);
    verify(auditEventPublisher)
        .publish(eq(userA), eq(AuditEventType.CARD_DELETED), anyString(), anyMap());
  }

  @Test
  void deleteCardBelongingToAnotherUserThrowsAndNeverDeletes() {
    UUID cardBelongingToUserB = UUID.randomUUID();
    when(paymentCardRepository.findByIdAndUserId(cardBelongingToUserB, userA))
        .thenReturn(Optional.empty());

    assertThatThrownBy(() -> cardService.deleteCard(authentication, cardBelongingToUserB))
        .isInstanceOf(PaymentCardNotFoundException.class);

    verify(paymentCardRepository, never()).deleteByIdAndUserId(any(), any());
  }

  private static void setField(Object target, String fieldName, Object value) {
    try {
      Field field = target.getClass().getDeclaredField(fieldName);
      field.setAccessible(true);
      field.set(target, value);
    } catch (ReflectiveOperationException e) {
      throw new RuntimeException(e);
    }
  }
}
