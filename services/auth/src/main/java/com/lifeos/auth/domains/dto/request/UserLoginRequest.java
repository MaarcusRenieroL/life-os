package com.lifeos.auth.domains.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserLoginRequest {

  @NotBlank String email;

  @NotBlank String rawPassword;

  String deviceName;

  String deviceType;
}
