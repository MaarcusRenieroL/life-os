package com.lifeos.batches.domains.record;

import com.lifeos.batches.domains.enums.AccountType;
import com.lifeos.batches.domains.enums.TransactionType;
import java.math.BigDecimal;
import java.time.Instant;

public record ParsedAlert(
    String bankName,
    AccountType accountType,
    BigDecimal amount,
    TransactionType type,
    Instant transactionDate,
    String description,
    String sourceReference,
    /** Last digits of the account the alert names, when it names one - lets finance pick the right account. */
    String accountSuffix) {}
