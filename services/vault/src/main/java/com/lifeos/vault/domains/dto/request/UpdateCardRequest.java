package com.lifeos.vault.domains.dto.request;

import com.lifeos.vault.domains.enums.NetworkType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateCardRequest {

  @Size(max = 255)
  String nickname;

  @NotNull NetworkType network;

  // Optional on update, same convention as VaultEntryService.updateEntry: only
  // re-encrypt+overwrite when the caller actually sent a new value, so the
  // frontend isn't forced to resend the full card number on every edit just to
  // change e.g. the nickname. Digits-only + min length when present, since
  // CardService.extractLastFourDigits does an unconditional Integer.parseInt
  // on the trailing 4 characters - anything else here should be a clean 400,
  // not a 500 from a failed parse.
  @Pattern(regexp = "^$|^\\d{4,19}$")
  String cardNumber;

  @Pattern(regexp = "^$|^\\d{3,4}$")
  String cvv;

  @Size(max = 255)
  String cardHolderName;

  @Size(max = 20)
  String billingZip;
}
