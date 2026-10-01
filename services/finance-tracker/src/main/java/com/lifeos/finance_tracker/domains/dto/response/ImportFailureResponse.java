package com.lifeos.finance_tracker.domains.dto.response;

import java.time.Instant;
import java.util.UUID;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ImportFailureResponse {
  UUID id;
  String source;
  String reason;
  String reference;
  String sender;
  String subject;
  String snippet;
  String detail;
  /** The money movement the alert described, when it could be read - shown so the user can see what is missing. */
  String bankName;
  String accountType;
  java.math.BigDecimal amount;
  String type;
  Instant transactionDate;
  String description;
  Instant createdAt;
}
