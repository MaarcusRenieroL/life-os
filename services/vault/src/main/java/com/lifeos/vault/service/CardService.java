package com.lifeos.vault.service;

import com.lifeos.vault.domains.dto.request.CreateCardRequest;
import com.lifeos.vault.domains.dto.request.UpdateCardRequest;
import com.lifeos.vault.domains.dto.response.CardResponse;
import com.lifeos.vault.domains.entity.PaymentCard;
import com.lifeos.vault.domains.record.VaultKeyRecord;
import com.lifeos.vault.exception.PaymentCardNotFoundException;
import com.lifeos.vault.exception.VaultLockedException;
import com.lifeos.vault.repository.PaymentCardRepository;
import com.lifeos.vault.store.VaultKeyStore;
import java.util.List;
import java.util.UUID;
import javax.crypto.SecretKey;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class CardService {

  private final PaymentCardRepository paymentCardRepository;
  private final VaultKeyStore vaultKeyStore;

  private final EncryptionService encryptionService;

  public List<CardResponse> getCards(Authentication authentication) {
    UUID userId = (UUID) authentication.getPrincipal();
    // Needed now even for the list view - expiry is decrypted on every read
    // (see CardResponse's class-level note), unlike cardNumber/cvv.
    SecretKey key = requireUnlockedKey(userId);

    return paymentCardRepository.findAllByUserId(userId).stream()
        .map((card) -> toResponse(card, key))
        .toList();
  }

  public CardResponse getCard(Authentication authentication, UUID id) {
    UUID userId = (UUID) authentication.getPrincipal();
    SecretKey key = requireUnlockedKey(userId);

    return toResponse(
        paymentCardRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> new PaymentCardNotFoundException(id)),
        key);
  }

  public CardResponse createCard(Authentication authentication, CreateCardRequest request) {
    UUID userId = (UUID) authentication.getPrincipal();
    SecretKey key = requireUnlockedKey(userId);

    int lastFourDigits = extractLastFourDigits(request.getCardNumber());

    var numberEnc = encryptionService.encrypt(request.getCardNumber(), key);
    var cvvEnc = encryptionService.encrypt(request.getCvv(), key);
    var expiryEnc = encryptionService.encrypt(request.getExpiry(), key);

    PaymentCard paymentCard =
        PaymentCard.builder()
            .userId(userId)
            .nickname(request.getNickname())
            .network(request.getNetwork())
            .lastFourDigits(lastFourDigits)
            .cardNumberEncrypted(numberEnc.ciphertext())
            .cardNumberIvv(numberEnc.iv())
            .cvvEncrypted(cvvEnc.ciphertext())
            .cvvIvv(cvvEnc.iv())
            .expiryEncrypted(expiryEnc.ciphertext())
            .expiryIvv(expiryEnc.iv())
            .cardHolderName(request.getCardHolderName())
            .billingZip(request.getBillingZip())
            .build();

    return toResponse(paymentCardRepository.save(paymentCard), key);
  }

  public CardResponse updateCard(
      Authentication authentication, UUID id, UpdateCardRequest request) {
    UUID userId = (UUID) authentication.getPrincipal();
    SecretKey key = requireUnlockedKey(userId);

    PaymentCard card =
        paymentCardRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> new PaymentCardNotFoundException(id));

    card.setNickname(request.getNickname());
    card.setNetwork(request.getNetwork());
    card.setCardHolderName(request.getCardHolderName());
    card.setBillingZip(request.getBillingZip());

    if (StringUtils.hasText(request.getCardNumber())) {
      var numberEnc = encryptionService.encrypt(request.getCardNumber(), key);

      card.setCardNumberEncrypted(numberEnc.ciphertext());
      card.setCardNumberIvv(numberEnc.iv());
      card.setLastFourDigits(extractLastFourDigits(request.getCardNumber()));
    }

    if (StringUtils.hasText(request.getCvv())) {
      var cvvEnc = encryptionService.encrypt(request.getCvv(), key);

      card.setCvvEncrypted(cvvEnc.ciphertext());
      card.setCvvIvv(cvvEnc.iv());
    }

    if (StringUtils.hasText(request.getExpiry())) {
      var expiryEnc = encryptionService.encrypt(request.getExpiry(), key);

      card.setExpiryEncrypted(expiryEnc.ciphertext());
      card.setExpiryIvv(expiryEnc.iv());
    }

    return toResponse(paymentCardRepository.save(card), key);
  }

  private int extractLastFourDigits(String cardNumber) {
    String lastFour = cardNumber.substring(cardNumber.length() - 4);

    return Integer.parseInt(lastFour);
  }

  @Transactional
  public void deleteCard(Authentication authentication, UUID id) {
    UUID userId = (UUID) authentication.getPrincipal();

    paymentCardRepository.deleteByIdAndUserId(id, userId);
  }

  private SecretKey requireUnlockedKey(UUID userId) {
    VaultKeyRecord record = vaultKeyStore.get(userId);
    if (record == null) {
      throw new VaultLockedException();
    }
    return record.key();
  }

  private CardResponse toResponse(PaymentCard card, SecretKey key) {
    String expiry =
        card.getExpiryEncrypted() == null
            ? null
            : encryptionService.decrypt(card.getExpiryEncrypted(), card.getExpiryIvv(), key);

    return CardResponse.builder()
        .id(card.getId())
        .nickname(card.getNickname())
        .network(card.getNetwork())
        .lastFourDigits(card.getLastFourDigits())
        .expiry(expiry)
        .cardHolderName(card.getCardHolderName())
        .billingZip(card.getBillingZip())
        .createdAt(card.getCreatedAt())
        .updatedAt(card.getUpdatedAt())
        .build();
  }
}
