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

/**
 * Deliberately masked-only: never put cardNumberEncrypted/cvvEncrypted (or their
 * decrypted values) on this response. The frontend gallery only ever needs
 * lastFourDigits - there's no "reveal full card number" flow in the design, so
 * there's no decrypted counterpart to VaultEntryResponse here.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CardResponse {

  UUID id;

  String nickname;

  NetworkType network;

  int lastFourDigits;

  String cardHolderName;

  String billingZip;

  Instant createdAt;

  Instant updatedAt;
}
