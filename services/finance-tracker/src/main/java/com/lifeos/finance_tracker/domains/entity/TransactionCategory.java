package com.lifeos.finance_tracker.domains.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;

// Additional category tags on a transaction, alongside its primary `categoryId`
// (Transaction.categoryId stays the single category budgets/analytics key off of;
// this table is purely for extra labels the user attaches on top of that).
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "transaction_categories", schema = "finance_schema")
public class TransactionCategory {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  UUID transactionId;

  UUID categoryId;

  @CreationTimestamp Instant createdAt;
}
