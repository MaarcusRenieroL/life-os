package com.lifeos.auth.domains.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserRegisterRequest {

  @NotBlank
  @Email
  @Size(max = 255)
  String email;

  @NotBlank
  @Size(min = 8, max = 72, message = "rawPassword must be 8 to 72 characters (BCrypt ignores anything longer)")
  String rawPassword;
}
