package com.lifeos.vault.domains.dto.response;

import java.util.List;
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
public class HealthSummaryResponse {

  // 0-100, clamped. See HealthService for the exact deduction formula to fill in.
  int score;

  int totalCount;

  int weakCount;

  int duplicateCount;

  // No real breach-detection source exists yet (would need a HaveIBeenPwned-style
  // API or dataset) - wire this to 0 for now rather than inventing a number, and
  // revisit once/if that's ever built. Kept as its own field (not folded into
  // weak/duplicate) since the frontend already renders it as a distinct stat.
  int compromisedCount;

  List<PasswordAgeBucketResponse> ageBuckets;

  List<ActionRequiredEntryResponse> actionRequired;
}
