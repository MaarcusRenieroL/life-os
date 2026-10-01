package com.lifeos.vault.domains.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateMasterPasswordRequest {

  @NotBlank
  @Size(max = 72)
  String currentPassword;

  @NotBlank
  @Size(min = 8, max = 72, message = "newPassword must be 8 to 72 characters")
  String newPassword;
}
