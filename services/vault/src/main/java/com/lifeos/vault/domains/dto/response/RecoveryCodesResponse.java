package com.lifeos.vault.domains.dto.response;

import java.util.List;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RecoveryCodesResponse {

  List<String> codes;
}
