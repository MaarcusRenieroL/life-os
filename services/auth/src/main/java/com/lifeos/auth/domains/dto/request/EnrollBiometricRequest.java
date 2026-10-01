package com.lifeos.auth.domains.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class EnrollBiometricRequest {

  @NotBlank @Size(max = 2000) String publicKey;

  @NotBlank @Size(max = 255) String deviceId;

  @Size(max = 50) String type;
}
