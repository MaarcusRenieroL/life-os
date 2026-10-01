package com.lifeos.auth.domains.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BiometricLoginRequest {

  @NotBlank @Size(max = 255) String deviceId;

  @NotBlank @Size(max = 500) String signature;

  @Size(max = 255) String deviceName;

  @Size(max = 50) String deviceType;
}
