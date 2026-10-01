package com.lifeos.finance_tracker.domains.dto.request;

import com.lifeos.finance_tracker.domains.enums.TransactionType;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateTransactionRequest {

  @Size(max = 200)
  String description;

  @Positive BigDecimal amount;

  TransactionType type;

  @Size(max = 500)
  String notes;

  @Size(max = 500)
  @Pattern(regexp = "^https?://\\S+$", message = "receiptUrl must be an http or https link")
  String receiptUrl;
}
