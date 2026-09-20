package com.lifeos.common.events;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Published by batches' Gmail bank-alert poller to the {@code bank-alert-events} topic, one per
 * parsed alert; finance-tracker consumes it and creates the transaction. accountType/type are
 * carried as plain strings (not shared enums) since batches and finance-tracker each keep their
 * own independent enum definitions for these - same reasoning as {@link JobEmailEventRecord}
 * being a raw shared shape rather than a service-specific DTO. */
public record BankAlertEventRecord(
    UUID userId,
    String bankName,
    String accountType,
    BigDecimal amount,
    String type,
    Instant transactionDate,
    String description,
    String sourceReference) {}
