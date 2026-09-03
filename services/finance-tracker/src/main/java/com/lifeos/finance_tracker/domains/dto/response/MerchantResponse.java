package com.lifeos.finance_tracker.domains.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class MerchantResponse {

  UUID id;

  String name;

  String description;

  UUID categoryId;

  String logoUrl;

  String website;

  int transactionCount;

  Instant lastTransactionDate;

  BigDecimal averageTransactionAmount;

  List<String> aliases;

  @JsonProperty("isRecognized")
  boolean isRecognized;

  Instant createdAt;
}
