package com.lifeos.finance_tracker.domains.entity;

import com.lifeos.finance_tracker.domains.enums.AccountType;
import com.lifeos.finance_tracker.domains.enums.CurrencyCode;
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
import org.hibernate.annotations.UpdateTimestamp;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "accounts", schema = "finance_schema")
public class Account {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  UUID userId;

  String accountName;

  @Enumerated(EnumType.STRING)
  AccountType accountType;

  String bankName;

  String accountNumberEncrypted;

  @Enumerated(EnumType.STRING)
  CurrencyCode currencyCode;

  Instant openedDate;

  BigDecimal currentBalance;

  boolean isActive;

  boolean isPrimary;

  String emailForAlerts;

  String notes;

  @CreationTimestamp Instant createdAt;

  @UpdateTimestamp Instant updatedAt;
}
