package com.lifeos.finance_tracker.domains.dto.request;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

// PUT /api/transactions/{id}/merge - {id} in the path is the canonical
// transaction; these are the duplicates to fold into it (marked isDuplicate,
// duplicateOf set to the canonical id).
@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class MergeTransactionsRequest {

  @NotEmpty List<UUID> duplicateTransactionIds;
}
