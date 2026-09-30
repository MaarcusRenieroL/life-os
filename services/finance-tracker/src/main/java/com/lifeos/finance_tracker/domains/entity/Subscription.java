package com.lifeos.finance_tracker.domains.entity;

import com.lifeos.finance_tracker.domains.enums.BillingCycle;
import com.lifeos.finance_tracker.domains.enums.SubscriptionStatus;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
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
@Table(name = "subscriptions", schema = "finance_schema")
public class Subscription {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  UUID userId;

  String name;

  BigDecimal amount;

  @Enumerated(EnumType.STRING)
  BillingCycle billingCycle;

  LocalDate nextBillingDate;

  // See the V13 migration for why billing dates are derived from this rather than the last date.
  Integer billingAnchorDay;

  @Enumerated(EnumType.STRING)
  @Builder.Default
  SubscriptionStatus status = SubscriptionStatus.ACTIVE;

  UUID accountId;

  UUID categoryId;

  @Builder.Default boolean autoCreateExpense = true;

  @Builder.Default int reminderDaysBefore = 3;

  LocalDate reminderSentFor;

  LocalDate lastBilledOn;

  // 1 (barely use it) to 5 (use it constantly); null until the user says.
  Integer usageRating;

  LocalDate lastUsedOn;

  String notes;

  Instant cancelledAt;

  @CreationTimestamp Instant createdAt;

  @UpdateTimestamp Instant updatedAt;
}
