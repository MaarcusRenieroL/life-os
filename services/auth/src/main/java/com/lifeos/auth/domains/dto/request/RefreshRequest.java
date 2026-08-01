package com.lifeos.auth.domains.dto.request;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RefreshRequest {

  String refreshToken;
}
