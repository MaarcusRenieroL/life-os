package com.lifeos.vault.domains.dto.response;

import java.time.Instant;
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
public class VaultStatusResponse {

  boolean hasMasterPassword;

  boolean unlocked;

  // Null until a master password has been set (or for rows created before this
  // field existed) - the plaintext password is never stored, so strength can only
  // be scored at setup/change time and persisted, not recomputed later.
  String masterPasswordStrength;

  Instant masterPasswordUpdatedAt;
}
