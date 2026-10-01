package com.lifeos.auth.domains.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

/** The current password, re-entered to confirm a destructive action. */
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PasswordRequest {

  @NotBlank @Size(max = 128) String password;
}
