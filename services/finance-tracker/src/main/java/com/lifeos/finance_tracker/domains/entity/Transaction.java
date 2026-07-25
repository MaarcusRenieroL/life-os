package com.lifeos.finance_tracker.domains.entity;

import com.lifeos.finance_tracker.domains.enums.SourceType;
import com.lifeos.finance_tracker.domains.enums.TransactionStatus;
import com.lifeos.finance_tracker.domains.enums.TransactionType;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
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
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "transactions", schema = "finance_schema")
public class Transaction {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  UUID accountId;

  UUID userId;

  Instant transactionDate;

  String description;

  BigDecimal amount;

  @Enumerated(EnumType.STRING)
  TransactionType type;

  UUID categoryId;

  boolean categoryManuallySet;

  @JdbcTypeCode(SqlTypes.JSON)
  List<String> tags;

  String notes;

  String receiptUrl;

  boolean isRecurring;

  @Enumerated(EnumType.STRING)
  SourceType sourceType;

  String sourceReference;

  boolean isReconciled;

  boolean isDuplicate;

  UUID duplicateOf;

  @Enumerated(EnumType.STRING)
  TransactionStatus status;

  Instant importedAt;

  @CreationTimestamp Instant createdAt;

  @UpdateTimestamp Instant updatedAt;
}
