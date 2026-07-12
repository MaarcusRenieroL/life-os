package com.lifeos.auth.domains.dto.response;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.experimental.FieldDefaults;

@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ChallengeResponse {

  String challenge;
}
