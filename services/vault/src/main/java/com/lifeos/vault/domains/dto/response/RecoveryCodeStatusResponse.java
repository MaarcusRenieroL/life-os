package com.lifeos.vault.domains.dto.response;

import java.time.Instant;
import java.util.UUID;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RecoveryCodeStatusResponse {

  UUID id;
  boolean used;
  Instant usedAt;
  Instant createdAt;
}
