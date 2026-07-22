package com.lifeos.vault.domains.dto.response;

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
public class VaultMasterPasswordSnapshotResponse {

  UUID id;

  String passwordHash;

  String salt;

  String strength;

  Instant createdAt;

  Instant updatedAt;
}
