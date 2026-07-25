package com.lifeos.finance_tracker.domains.entity;

import com.lifeos.finance_tracker.domains.enums.CategoryType;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "categories", schema = "finance_schema")
public class Category {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  // Nullable - null means a system/global category shared across users,
  // matching the spec's "system categories" concept.
  UUID userId;

  String name;

  @Enumerated(EnumType.STRING)
  CategoryType type;

  String color;

  String icon;

  UUID parentCategoryId;

  boolean isActive;

  int displayOrder;

  @CreationTimestamp Instant createdAt;
}
