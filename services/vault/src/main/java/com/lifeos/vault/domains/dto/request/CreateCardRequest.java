package com.lifeos.vault.domains.dto.request;

import com.lifeos.vault.domains.enums.NetworkType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateCardRequest {

  @Size(max = 255)
  String nickname;

  @NotNull NetworkType network;

  // Raw values - the service encrypts these before persisting, same pattern as
  // VaultEntryService encrypting password/notes. Never store these as-is.
  // Digits-only + min length matters beyond validation noise: the service reads
  // the last 4 characters unconditionally (via Integer.parseInt) to populate
  // lastFourDigits, so anything shorter or non-numeric needs to be rejected here
  // with a clean 400 rather than blowing up in the service.
  @NotBlank
  @Pattern(regexp = "^\\d{4,19}$")
  String cardNumber;

  @NotBlank
  @Pattern(regexp = "^\\d{3,4}$")
  String cvv;

  // MM/YY, matching the AddCard form's input mask. Encrypted at rest same as
  // cardNumber/cvv, but decrypted back out on every read (see CardResponse).
  @NotBlank
  @Pattern(regexp = "^(0[1-9]|1[0-2])/\\d{2}$")
  String expiry;

  // NOTE: the entity also has a passwordEncrypted/passwordIv pair whose purpose
  // isn't clear (an online-banking password tied to this card?). Left out of this
  // request for now - add a `cardPassword` field here (and to UpdateCardRequest)
  // once its purpose is settled, otherwise that column will just stay unused.

  @Size(max = 255)
  String cardHolderName;

  @Size(max = 20)
  String billingZip;
}
