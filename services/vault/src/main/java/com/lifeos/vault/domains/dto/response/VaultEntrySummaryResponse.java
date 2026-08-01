package com.lifeos.vault.domains.dto.response;

import com.lifeos.vault.domains.enums.VaultEntryType;
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
public class VaultEntrySummaryResponse {

  UUID id;

  VaultEntryType type;

  String title;

  String email;

  String username;

  String url;

  String icon;

  UUID categoryId;

  boolean favorite;

  Instant expiresAt;

  Instant createdAt;

  Instant updatedAt;
}
