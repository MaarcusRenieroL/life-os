package com.lifeos.finance_tracker.domains.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

// Lets batches import a whole parsed statement in one internal-API call instead of one call per
// row - see TransactionService.createFromCsvImportBatch. @Valid cascades row-level validation
// (@NotNull/@NotBlank etc. on CreateCsvImportTransactionRequest) to every entry in the list.
@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateCsvImportTransactionBatchRequest {

  @NotEmpty @Valid List<CreateCsvImportTransactionRequest> transactions;
}
