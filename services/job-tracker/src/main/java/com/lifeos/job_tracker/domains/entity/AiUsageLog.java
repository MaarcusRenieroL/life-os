package com.lifeos.job_tracker.domains.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

/** One completed Claude API call - self-tracked so the home-page usage widget doesn't need the
 * org-admin-only Anthropic Usage & Cost Admin API. Ollama calls aren't logged here since they're
 * free (local). */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "ai_usage_log", schema = "job_tracker_schema")
public class AiUsageLog {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  String model;

  @Column(name = "input_tokens")
  int inputTokens;

  @Column(name = "output_tokens")
  int outputTokens;

  @Column(name = "estimated_cost_usd")
  BigDecimal estimatedCostUsd;

  @CreationTimestamp
  @Column(name = "created_at")
  Instant createdAt;
}
