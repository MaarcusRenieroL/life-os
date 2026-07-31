package com.lifeos.batches.controller;

import com.lifeos.batches.domains.record.StatementImportResult;
import com.lifeos.batches.service.StatementImportService;
import com.lifeos.common.domains.dto.response.ApiResponse;
import java.io.IOException;
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
  public ResponseEntity<ApiResponse<StatementImportResult>> importStatement(
      Authentication authentication,
      @RequestParam("file") MultipartFile file,
      @RequestParam("accountId") UUID accountId,
      @RequestParam(value = "password", required = false) String password)
      throws IOException {
    UUID userId = (UUID) authentication.getPrincipal();

    StatementImportResult result = statementImportService.importStatement(userId, file, accountId, password);

    return ResponseEntity.ok(
        ApiResponse.success(
            result,
            result.rowsImported() + " of " + result.rowsParsed() + " transactions imported"));
  }
}
