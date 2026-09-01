package com.lifeos.finance_tracker.domains.dto.request;

import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateMerchantRequest {

  @Size(max = 150)
  String name;

  @Size(max = 500)
  String description;

  UUID categoryId;

  String logoUrl;

  String website;

  List<String> aliases;
}
