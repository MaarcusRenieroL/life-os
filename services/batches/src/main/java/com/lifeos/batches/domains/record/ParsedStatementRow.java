package com.lifeos.batches.domains.record;

import com.lifeos.batches.domains.enums.TransactionType;
import java.math.BigDecimal;
import java.time.Instant;

public record ParsedStatementRow(
    Instant transactionDate, String description, BigDecimal amount, TransactionType type) {}
