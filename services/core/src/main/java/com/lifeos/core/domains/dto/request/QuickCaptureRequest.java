package com.lifeos.core.domains.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class QuickCaptureRequest {

  @NotBlank String text;

  boolean useClaudeFallback;
}
