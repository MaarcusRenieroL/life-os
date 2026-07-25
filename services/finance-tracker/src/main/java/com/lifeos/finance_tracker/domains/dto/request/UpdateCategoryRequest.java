package com.lifeos.finance_tracker.domains.dto.request;

import com.lifeos.finance_tracker.domains.enums.CategoryType;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateCategoryRequest {

  @Size(max = 100)
  String name;

  CategoryType type;

  @Pattern(regexp = "^$|^#[0-9A-Fa-f]{6}$")
  String color;

  @Size(max = 50)
  String icon;

  UUID parentCategoryId;

  Boolean isActive;

  Integer displayOrder;
}
