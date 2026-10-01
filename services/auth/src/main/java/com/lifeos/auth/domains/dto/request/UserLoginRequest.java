package com.lifeos.auth.domains.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserLoginRequest {

  @NotBlank @Size(max = 255) String email;

  @NotBlank @Size(max = 128) String rawPassword;

  @Size(max = 255) String deviceName;

  @Size(max = 50) String deviceType;
}
