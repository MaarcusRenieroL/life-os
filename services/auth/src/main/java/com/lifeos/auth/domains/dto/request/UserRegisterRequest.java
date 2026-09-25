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
  String email;

  @NotBlank
  @Size(min = 8, message = "rawPassword must be at least 8 characters")
  String rawPassword;
}
