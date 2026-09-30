package com.lifeos.workouts.domains.entity;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import org.hibernate.annotations.CreationTimestamp;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
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
@Entity
@Table(name = "body_measurements", schema = "workouts_schema")
public class BodyMeasurement {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  UUID userId;

  LocalDate measuredOn;

  BigDecimal weightKg;

  BigDecimal chestCm;

  BigDecimal waistCm;

  BigDecimal armsCm;

  BigDecimal legsCm;

  BigDecimal bodyFatPct;

  String notes;

  @CreationTimestamp Instant createdAt;
}
