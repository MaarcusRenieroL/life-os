package com.lifeos.finance_tracker.domains.dto.response;

/** How many rows of a batched CSV-import request actually got persisted - the rest were skipped
 * (bad row data) or deduplicated against an existing transaction, same as the single-row endpoint
 * already did silently per row; this just reports the aggregate instead of nothing at all. */
public record CsvImportBatchResponse(int totalRows, int imported) {}
