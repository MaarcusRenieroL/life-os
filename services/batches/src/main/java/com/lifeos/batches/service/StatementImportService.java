package com.lifeos.batches.service;

import com.lifeos.batches.config.FinanceTrackerClient;
import com.lifeos.batches.domains.dto.request.CreateCsvImportTransactionRequest;
import com.lifeos.batches.domains.record.ParsedStatementRow;
import com.lifeos.batches.domains.record.StatementImportResult;
import com.lifeos.batches.exception.StatementParseException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

// Runs synchronously (parses + posts every row before returning) rather than
// as a fire-and-forget async job - statement files are small enough that
// this finishes in well under a second, and it means a bad password or an
// unrecognized layout comes back as a real error instead of failing silently
// in the background with the UI reporting a false "Import started".
@Service
@RequiredArgsConstructor
public class StatementImportService {

  private static final Logger log = LoggerFactory.getLogger(StatementImportService.class);

  private final CsvStatementParser csvStatementParser;
  private final PdfStatementParser pdfStatementParser;
  private final FinanceTrackerClient financeTrackerClient;

  public StatementImportResult importStatement(
      UUID userId, MultipartFile file, UUID accountId, String password) throws IOException {
    String fileName = safeFileName(file.getOriginalFilename());
    Path tempFile = Files.createTempFile("statement-", "-" + fileName);

    try {
      file.transferTo(tempFile);

      List<ParsedStatementRow> rows = parse(tempFile, password);
      log.info("Parsed {} rows from statement {}", rows.size(), fileName);

      int imported = 0;
      for (ParsedStatementRow row : rows) {
        try {
          financeTrackerClient.createCsvImportTransaction(
              CreateCsvImportTransactionRequest.builder()
                  .userId(userId)
                  .accountId(accountId)
                  .transactionDate(row.transactionDate())
                  .description(row.description())
                  .amount(row.amount())
                  .type(row.type())
                  .build());
          imported++;
        } catch (Exception e) {
          log.error("Failed to import a parsed statement row: {}", e.getMessage());
        }
      }

      return new StatementImportResult(rows.size(), imported);
    } finally {
      Files.deleteIfExists(tempFile);
    }
  }

  private List<ParsedStatementRow> parse(Path filePath, String password) throws IOException {
    String name = filePath.getFileName().toString().toLowerCase(Locale.ROOT);

    if (name.endsWith(".pdf")) {
      return pdfStatementParser.parse(filePath, password);
    }
    if (name.endsWith(".csv")) {
      return csvStatementParser.parse(filePath);
    }

    throw new StatementParseException(
        "Unsupported statement file type - only CSV and PDF are supported right now");
  }

  private String safeFileName(String originalFilename) {
    if (originalFilename == null || originalFilename.isBlank()) {
      return "statement.csv";
    }

    String name = originalFilename.replaceAll("^.*[/\\\\]", "");

    return name.isBlank() ? "statement.csv" : name;
  }
}
