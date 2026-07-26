package com.lifeos.finance_tracker.domains.entity;

import com.lifeos.finance_tracker.domains.enums.RecurringFrequency;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "recurring_patterns", schema = "finance_schema")
public class RecurringPattern {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  UUID userId;

  UUID merchantId;

  // Normalized merchant name from MerchantClusteringService's LLM output -
  // used to dedupe/upsert patterns across detection runs, since merchantId
  // isn't reliably populated on Transaction yet.
  String merchantKey;

  UUID categoryId;

  BigDecimal averageAmount;

  @Enumerated(EnumType.STRING)
  RecurringFrequency frequency;

  int expectedDayOfCycle;

  Instant lastTransactionDate;

  Instant nextExpectedDate;

  BigDecimal variance;

  BigDecimal confidenceScore;

  Instant lastDetectedAt;

  @CreationTimestamp Instant createdAt;
}
