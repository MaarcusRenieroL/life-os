package com.lifeos.finance_tracker.domains.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

/** Sent by batches for an alert email it could not parse into a transaction. */
@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ReportImportFailureRequest {

  @NotNull UUID userId;

  @NotBlank String reference;

  String sender;

  String subject;

  String snippet;

  String detail;
}
