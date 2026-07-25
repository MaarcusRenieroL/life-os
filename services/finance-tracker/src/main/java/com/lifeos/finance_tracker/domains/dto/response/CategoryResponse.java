package com.lifeos.finance_tracker.domains.dto.response;

import com.lifeos.finance_tracker.domains.enums.CategoryType;
import java.time.Instant;
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
public class CategoryResponse {

  UUID id;

  String name;

  CategoryType type;

  String color;

  String icon;

  UUID parentCategoryId;

  boolean isActive;

  int displayOrder;

  Instant createdAt;
}
