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
 * Deliberately masked-only for the number/CVV: never put cardNumberEncrypted/
 * cvvEncrypted (or their decrypted values) on this response - there's no
 * "reveal full card number" flow in the design. `expiry` is the one exception:
 * the design shows it unmasked on the card face, so CardService decrypts it
 * back out here even though it's encrypted at rest.
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

  // MM/YY, decrypted - see class-level note.
  String expiry;

  String cardHolderName;

  String billingZip;

  Instant createdAt;

  Instant updatedAt;
}
