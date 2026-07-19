package com.lifeos.vault.domains.dto.response;

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
public class PasswordAgeBucketResponse {

  // "<3mo" | "3-6mo" | "6-12mo" | "1y+" - matches the 4 buckets the frontend's
  // age-distribution chart already expects (vault-health.ts).
  String label;

  int count;
}
