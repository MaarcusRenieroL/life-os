package com.lifeos.batches.domains.dto.request;

import java.util.List;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateCsvImportTransactionBatchRequest {

  List<CreateCsvImportTransactionRequest> transactions;
}
