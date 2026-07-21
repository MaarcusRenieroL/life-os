package com.lifeos.core.domains.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ModuleSettingResponse {

  String moduleCode;

  boolean enabled;
}
