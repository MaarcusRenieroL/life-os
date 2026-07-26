package com.lifeos.batches.controller;

import com.lifeos.batches.service.StatementImportService;
import com.lifeos.common.domains.dto.response.ApiResponse;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequiredArgsConstructor
@RequestMapping("/v1/batches/finance")
public class StatementImportController {

  private final StatementImportService statementImportService;

  @PostMapping("/import-statement")
  public ResponseEntity<ApiResponse<Void>> importStatement(
      Authentication authentication,
      @RequestParam("file") MultipartFile file,
      @RequestParam("accountId") UUID accountId)
      throws Exception {
    UUID userId = (UUID) authentication.getPrincipal();

    statementImportService.importStatement(userId, file, accountId);

    return ResponseEntity.ok(ApiResponse.success(null, "Import started"));
  }
}
