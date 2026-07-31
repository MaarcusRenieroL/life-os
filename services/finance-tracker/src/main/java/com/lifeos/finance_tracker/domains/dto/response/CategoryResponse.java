package com.lifeos.finance_tracker.domains.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
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

  // Lombok's getter for a `boolean isXxx` field is isXxx() - Jackson's default
  // bean-property naming then strips the "is" prefix from that getter name,
  // serializing this as "active" instead of "isActive" and silently breaking
  // any frontend code that reads response.isActive. Force the intended name.
  @JsonProperty("isActive")
  boolean isActive;

  boolean excludeFromAutoLearning;

  int displayOrder;

  Instant createdAt;
}
