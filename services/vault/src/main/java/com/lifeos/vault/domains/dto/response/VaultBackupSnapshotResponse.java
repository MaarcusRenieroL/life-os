package com.lifeos.vault.domains.dto.response;

import java.time.Instant;
import java.util.List;
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
public class VaultBackupSnapshotResponse {

  List<VaultEntrySnapshotResponse> entries;

  List<PaymentCardSnapshotResponse> cards;

  List<VaultCategorySnapshotResponse> categories;

  VaultMasterPasswordSnapshotResponse masterPassword;

  Instant snapshotAt;
}
