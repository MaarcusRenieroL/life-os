package com.lifeos.vault.domains.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateMasterPasswordRequest {

  @NotBlank String currentPassword;

  @NotBlank
  @Size(min = 8)
  String newPassword;
}
