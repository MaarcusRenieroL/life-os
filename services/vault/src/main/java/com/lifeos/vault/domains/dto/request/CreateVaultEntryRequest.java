package com.lifeos.vault.domains.dto.request;

import com.lifeos.vault.domains.enums.VaultEntryType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateVaultEntryRequest {

  @NotNull VaultEntryType type;

  @NotBlank
  @Size(max = 255)
  String title;

  @Email
  @Size(max = 255)
  String email;

  @Size(max = 255)
  String username;

  @Size(max = 2048)
  String url;

  @Size(max = 2048)
  String icon;

  @Size(max = 1000)
  String password;

  @Size(max = 5000)
  String notes;

  UUID categoryId;

  boolean favorite;

  Instant expiresAt;
}
