package com.lifeos.vault.domains.dto.response;

import java.util.UUID;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ActionRequiredEntryResponse {

  UUID id;

  String title;

  // e.g. "Weak password" / "Reused password" - short human-readable reason this
  // entry showed up in the list, drives the "Change now" vs "Review" link label
  // on the frontend (vault-health.ts already has this exact distinction).
  String issue;
}
