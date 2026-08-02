package com.lifeos.finance_tracker.domains.entity;

import jakarta.persistence.Entity;
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
import org.hibernate.annotations.UpdateTimestamp;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "user_finance_settings", schema = "finance_schema")
public class UserFinanceSettings {

  @Id UUID userId;

  // Fixed known monthly salary/income, set by the user - distinct from
  // DashboardSummary's totalIncome, which is derived from this month's
  // CREDIT transactions and can be thrown off by self-transfers, refunds,
  // or a month not yet fully imported.
  BigDecimal monthlyIncome;

  @UpdateTimestamp Instant updatedAt;
}
