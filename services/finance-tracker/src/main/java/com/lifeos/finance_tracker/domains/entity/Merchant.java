package com.lifeos.finance_tracker.domains.entity;

import jakarta.persistence.Entity;
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
import org.hibernate.type.SqlTypes;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "merchants", schema = "finance_schema")
public class Merchant {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  // Nullable - null means a global merchant recognized across users.
  UUID userId;

  String name;

  String description;

  // Nullable - a merchant can exist before it's been assigned a category.
  UUID categoryId;

  String logoUrl;

  String website;

  int transactionCount;

  Instant lastTransactionDate;

  BigDecimal averageTransactionAmount;

  @JdbcTypeCode(SqlTypes.JSON)
  List<String> aliases;

  boolean isRecognized;

  @CreationTimestamp Instant createdAt;
}
