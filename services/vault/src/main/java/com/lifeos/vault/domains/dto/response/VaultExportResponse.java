package com.lifeos.vault.domains.dto.response;

import java.time.Instant;
import java.util.List;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.experimental.FieldDefaults;

@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class VaultExportResponse {

  List<VaultEntryResponse> entries;

  List<VaultExportCardResponse> cards;

  Instant exportedAt;
}
