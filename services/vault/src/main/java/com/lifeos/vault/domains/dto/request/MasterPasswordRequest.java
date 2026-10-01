package com.lifeos.vault.domains.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class MasterPasswordRequest {

  @NotBlank
  @Size(max = 72, message = "masterPassword must be at most 72 characters")
  String masterPassword;
}
