package com.lifeos.vault.domains.dto.request;

import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

// Deliberately not @Valid-cascaded at the controller - a single bad row (e.g. one CSV
// line missing a title) shouldn't 400 the entire batch. Each row is validated and
// saved independently inside VaultEntryService.saveEntries so the rest can still land.
@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BulkCreateVaultEntryRequest {

  List<CreateVaultEntryRequest> entries;
}
