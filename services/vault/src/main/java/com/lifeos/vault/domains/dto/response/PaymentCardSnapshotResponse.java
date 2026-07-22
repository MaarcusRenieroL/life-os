package com.lifeos.vault.domains.dto.response;

import com.lifeos.vault.domains.enums.NetworkType;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PaymentCardSnapshotResponse {

  UUID id;

  String nickname;

  NetworkType network;

  int lastFourDigits;

  String cardNumberEncrypted;

  String cardNumberIv;

  String passwordEncrypted;

  String passwordIv;

  String cvvEncrypted;

  String cvvIv;

  String expiryEncrypted;

  String expiryIv;

  String cardHolderName;

  String billingZip;

  Instant createdAt;

  Instant updatedAt;
}
