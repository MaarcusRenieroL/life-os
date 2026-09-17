package com.lifeos.batches.service;

import com.lifeos.batches.domains.enums.TransactionType;
import com.lifeos.batches.domains.record.ParsedStatementRow;
import com.lifeos.batches.exception.StatementParseException;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

// Indian bank CSV exports vary in header naming (HDFC, Canara, etc.) but converge
// on the same handful of columns, so this matches by header name rather than a
// fixed per-bank layout. Rows whose header can't be matched at all are rejected
// up front; individual data rows that fail to parse are skipped and logged
// rather than failing the whole import.
@Component
public class CsvStatementParser {

  private static final Logger log = LoggerFactory.getLogger(CsvStatementParser.class);
  private static final ZoneId ZONE_ID = ZoneId.of("Asia/Kolkata");

  private static final List<String> DATE_HEADERS = List.of("date", "value dt", "value date", "txn date", "transaction date");
  private static final List<String> DESCRIPTION_HEADERS =
      List.of("narration", "description", "particulars", "transaction details", "remarks");
  private static final List<String> DEBIT_HEADERS =
      List.of("withdrawal amt.", "withdrawal amt", "debit", "debit amount", "withdrawal");
  private static final List<String> CREDIT_HEADERS =
      List.of("deposit amt.", "deposit amt", "credit", "credit amount", "deposit");

  private static final List<DateTimeFormatter> DATE_FORMATS =
      List.of(
          DateTimeFormatter.ofPattern("dd/MM/yy"),
          DateTimeFormatter.ofPattern("dd/MM/yyyy"),
          DateTimeFormatter.ofPattern("dd-MM-yy"),
          DateTimeFormatter.ofPattern("dd-MM-yyyy"),
          DateTimeFormatter.ofPattern("yyyy-MM-dd"));

  public List<ParsedStatementRow> parse(Path file) throws IOException {
    List<List<String>> rows = readCsvRows(file);

    if (rows.isEmpty()) {
      throw new StatementParseException("CSV file is empty");
    }

    ColumnIndexes columns = findHeaderRow(rows);
    List<ParsedStatementRow> result = new ArrayList<>();

    for (int i = columns.headerRowIndex() + 1; i < rows.size(); i++) {
      List<String> row = rows.get(i);
      try {
        ParsedStatementRow parsed = parseRow(row, columns);
        if (parsed != null) {
          result.add(parsed);
        }
      } catch (Exception e) {
        log.warn("Skipping unparseable CSV row {}: {}", i, e.getMessage());
      }
    }

    if (result.isEmpty()) {
      throw new StatementParseException("No transactions could be parsed from this CSV");
    }

    return result;
  }

  private ParsedStatementRow parseRow(List<String> row, ColumnIndexes columns) {
    String dateText = cell(row, columns.dateIndex());
    String description = cell(row, columns.descriptionIndex());
    String debitText = cell(row, columns.debitIndex());
    String creditText = cell(row, columns.creditIndex());

    if (dateText.isBlank() || description.isBlank()) {
      return null;
    }

    BigDecimal debit = parseAmount(debitText);
    BigDecimal credit = parseAmount(creditText);

    BigDecimal amount;
    TransactionType type;
    if (credit != null && credit.signum() > 0) {
      amount = credit;
      type = TransactionType.CREDIT;
    } else if (debit != null && debit.signum() > 0) {
      amount = debit;
      type = TransactionType.DEBIT;
    } else {
      return null;
    }

    LocalDate date = parseDate(dateText);
    if (date == null) {
      return null;
    }

    return new ParsedStatementRow(
        date.atStartOfDay(ZONE_ID).toInstant(), MerchantNameNormalizer.normalize(description), amount, type);
  }

  private BigDecimal parseAmount(String text) {
    if (text == null || text.isBlank()) {
      return null;
    }
    String cleaned = text.replace(",", "").replaceAll("[^0-9.\\-]", "").trim();
    if (cleaned.isBlank() || cleaned.equals("-")) {
      return null;
    }
    try {
      return new BigDecimal(cleaned).abs();
    } catch (NumberFormatException e) {
      return null;
    }
  }

  private LocalDate parseDate(String text) {
    String trimmed = text.trim();
    for (DateTimeFormatter format : DATE_FORMATS) {
      try {
        return LocalDate.parse(trimmed, format);
      } catch (DateTimeParseException ignored) {
        // try next format
      }
    }
    return null;
  }

  private String cell(List<String> row, int index) {
    return index >= 0 && index < row.size() ? row.get(index) : "";
  }

  private ColumnIndexes findHeaderRow(List<List<String>> rows) {
    // Bank CSV exports often have a few preamble lines (account summary etc.)
    // before the real header - scan the first handful of rows for one that
    // looks like a header (contains a recognizable date column name).
    int maxScan = Math.min(rows.size(), 15);
    for (int i = 0; i < maxScan; i++) {
      List<String> row = rows.get(i);
      int dateIdx = findColumn(row, DATE_HEADERS);
      if (dateIdx == -1) {
        continue;
      }
      int descIdx = findColumn(row, DESCRIPTION_HEADERS);
      int debitIdx = findColumn(row, DEBIT_HEADERS);
      int creditIdx = findColumn(row, CREDIT_HEADERS);
      if (descIdx != -1 && (debitIdx != -1 || creditIdx != -1)) {
        return new ColumnIndexes(i, dateIdx, descIdx, debitIdx, creditIdx);
      }
    }
    throw new StatementParseException(
        "Could not find a recognizable header row (need date, description and debit/credit columns)");
  }

  private int findColumn(List<String> row, List<String> candidates) {
    for (int i = 0; i < row.size(); i++) {
      String normalized = row.get(i).trim().toLowerCase(Locale.ROOT);
      if (candidates.contains(normalized)) {
        return i;
      }
    }
    return -1;
  }

  private List<List<String>> readCsvRows(Path file) throws IOException {
    List<List<String>> rows = new ArrayList<>();
    for (String line : Files.readAllLines(file)) {
      if (line.isBlank()) {
        continue;
      }
      rows.add(splitCsvLine(line));
    }
    return rows;
  }

  // Minimal quoted-field-aware CSV split - handles "a,b" style fields with
  // embedded commas and escaped quotes, without pulling in a CSV library.
  private List<String> splitCsvLine(String line) {
    List<String> fields = new ArrayList<>();
    StringBuilder current = new StringBuilder();
    boolean inQuotes = false;

    for (int i = 0; i < line.length(); i++) {
      char c = line.charAt(i);
      if (inQuotes) {
        if (c == '"' && i + 1 < line.length() && line.charAt(i + 1) == '"') {
          current.append('"');
          i++;
        } else if (c == '"') {
          inQuotes = false;
        } else {
          current.append(c);
        }
      } else if (c == '"') {
        inQuotes = true;
      } else if (c == ',') {
        fields.add(current.toString());
        current.setLength(0);
      } else {
        current.append(c);
      }
    }
    fields.add(current.toString());
    return fields;
  }

  private record ColumnIndexes(
      int headerRowIndex, int dateIndex, int descriptionIndex, int debitIndex, int creditIndex) {}
}
