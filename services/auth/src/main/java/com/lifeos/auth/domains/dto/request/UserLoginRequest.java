package com.lifeos.auth.domains.dto.request;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserLoginRequest {

  String email;

  String rawPassword;

  String deviceName;

  String deviceType;
}
