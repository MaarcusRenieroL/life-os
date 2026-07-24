package com.lifeos.auth.domains.dto.response;

import java.util.UUID;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserProfileResponse {

  UUID id;

  String email;

  String name;
}
