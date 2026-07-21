package com.lifeos.vault.domains.entity;

import com.lifeos.vault.domains.enums.NetworkType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "payment_cards", schema = "vault_schema")
public class PaymentCard {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  UUID userId;

  String nickname;

  @Enumerated(EnumType.STRING)
  NetworkType network;

  int lastFourDigits;

  String cardNumberEncrypted;

  // Column name kept as-is (card_number_ivv) to avoid a migration - only the
  // Java-side field/getter name changed, to match VaultEntry's iv naming.
  @Column(name = "card_number_ivv")
  String cardNumberIv;

  String passwordEncrypted;

  @Column(name = "password_ivv")
  String passwordIv;

  String cvvEncrypted;

  @Column(name = "cvv_ivv")
  String cvvIv;

  // Encrypted at rest like cardNumber/cvv, but unlike those two, expiry IS
  // shown directly on the masked card face in the UI (design shows "EXP 09/28"
  // unmasked) - so CardService decrypts it on every read, not just on demand.
  String expiryEncrypted;

  @Column(name = "expiry_ivv")
  String expiryIv;

  String cardHolderName;

  String billingZip;

  @CreationTimestamp Instant createdAt;

  @UpdateTimestamp Instant updatedAt;
}
