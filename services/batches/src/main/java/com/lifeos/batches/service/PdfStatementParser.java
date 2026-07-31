package com.lifeos.batches.service;

import com.lifeos.batches.domains.enums.TransactionType;
import com.lifeos.batches.domains.record.ParsedStatementRow;
import com.lifeos.batches.exception.StatementParseException;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.encryption.InvalidPasswordException;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.text.TextPosition;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

// Bank statement PDFs don't expose real table structure to PDFBox - just
// positioned text - and PDFTextStripper's default reading order groups text
// by column across several rows rather than row-by-row, so a plain line-based
// parser can't work here. This does real (x, y) based table reconstruction:
// group text fragments into visual rows by y-coordinate, find the header
// row's column x-positions once, then bucket every other row's fragments
// into columns by which header they're closest to.
//
// Different banks lay this out differently - Canara's e-Passbook has 5
// columns (Date / Particulars / Deposits / Withdrawals / Balance) with the
// date+amount row appearing mid-block and a literal "Chq:" row marking the
// block's end; HDFC's statement has 7 columns (Date / Narration /
// Chq./Ref.No. / Value Dt / Withdrawal Amt. / Deposit Amt. / Closing
// Balance) with the date+amount on the block's FIRST row and no terminator
// row at all - the next date row silently starts the next block. Column
// boundaries are derived from every token in the header row (not just the
// 5 semantic ones), so unrecognized columns like Chq/Ref or Value Dt carve
// out their own space instead of bleeding into the Narration bucket, and
// the block-boundary logic handles both conventions at once (see the loop
// in parse()).
@Component
public class PdfStatementParser {

  private static final Logger log = LoggerFactory.getLogger(PdfStatementParser.class);
  private static final ZoneId ZONE_ID = ZoneId.of("Asia/Kolkata");
  private static final float ROW_TOLERANCE = 3f;

  private static final Pattern DATE_TOKEN = Pattern.compile("^\\d{2}[/-]\\d{2}[/-]\\d{2,4}$");
  private static final Pattern AMOUNT_TOKEN = Pattern.compile("^[0-9][0-9,]*\\.\\d{2}$");

  private static final List<DateTimeFormatter> DATE_FORMATS =
      List.of(
          DateTimeFormatter.ofPattern("dd/MM/yy"),
          DateTimeFormatter.ofPattern("dd/MM/yyyy"),
          DateTimeFormatter.ofPattern("dd-MM-yy"),
          DateTimeFormatter.ofPattern("dd-MM-yyyy"));

  // Fixed boilerplate phrases that show up in the page-footer disclaimer
  // paragraph printed right after the last transaction on a page (before the
  // "Page No" marker) - a fairly standard pattern across Indian bank
  // statements even though exact wording varies. Any row containing one of
  // these is treated as the start of dead zone content, same as "Page No".
  private static final List<String> DISCLAIMER_MARKERS =
      List.of(
          "considered correct",
          "days of receipt",
          "registered office",
          "gstin",
          "closing balance includes",
          "bank limited");

  private static final List<String> DATE_HEADER_ALIASES = List.of("date");
  private static final List<String> DESCRIPTION_HEADER_ALIASES = List.of("particulars", "narration", "description");
  private static final List<String> DEBIT_HEADER_ALIASES = List.of("withdrawal", "debit");
  private static final List<String> CREDIT_HEADER_ALIASES = List.of("deposit", "credit");
  private static final List<String> BALANCE_HEADER_ALIASES = List.of("balance");

  public List<ParsedStatementRow> parse(Path file, String password) throws IOException {
    List<Token> tokens;

    try (PDDocument document = Loader.loadPDF(file.toFile(), password == null ? "" : password)) {
      TableCapturingStripper stripper = new TableCapturingStripper();
      stripper.setSortByPosition(true);
      stripper.getText(document);
      tokens = stripper.tokens;
    } catch (InvalidPasswordException e) {
      throw new StatementParseException(
          password == null || password.isBlank()
              ? "This PDF is password-protected - please provide the password"
              : "The password provided didn't open this PDF",
          e);
    }

    List<Row> rows = groupIntoRows(tokens);
    Columns columns = findColumns(rows);

    List<ParsedStatementRow> result = new ArrayList<>();

    // A transaction block can be terminated two different ways depending on
    // the bank: a literal "Chq:" row (Canara), or simply the next row that
    // carries a date (HDFC, which has no terminator row at all). Rather than
    // pick one convention, both are handled: seeing a new date while a date
    // is already pending finalizes the previous block first (HDFC-style);
    // seeing "Chq:" always finalizes immediately (Canara-style). Either way
    // description lines accumulate from whatever rows sit between the start
    // of a block and whichever terminator fires first.
    List<String> pendingDescription = new ArrayList<>();
    LocalDate pendingDate = null;
    BigDecimal pendingAmount = null;
    TransactionType pendingType = null;

    // Multi-page statements repeat a page-footer disclaimer and/or an
    // account-holder address block between the last real transaction row of
    // one page and the point the table resumes on the next - none of that
    // text belongs to any transaction, but nothing else marks where it
    // starts (it isn't blank, "Chq"-prefixed, or an Opening/Closing Balance
    // line). The column header row itself is NOT a reliable resume marker -
    // some banks only print it once on the first page. A page footer's
    // "Page No" marker brackets where the dead zone starts; "Statement of
    // account" (present once per page right before the table resumes, even
    // on pages with no repeated header) brackets where it ends.
    boolean inTable = false;

    for (Row row : rows) {
      String rowText = row.text();
      String lowerText = rowText.toLowerCase(Locale.ROOT);

      if (isHeaderRow(row)) {
        finalize(result, pendingDate, pendingAmount, pendingType, pendingDescription);
        pendingDescription.clear();
        pendingDate = null;
        pendingAmount = null;
        inTable = true;
        continue;
      }
      if (rowText.isBlank()) {
        continue;
      }
      if (lowerText.contains("page no") || isFooterDisclaimerRow(lowerText)) {
        finalize(result, pendingDate, pendingAmount, pendingType, pendingDescription);
        pendingDescription.clear();
        pendingDate = null;
        pendingAmount = null;
        inTable = false;
        continue;
      }
      if (lowerText.contains("statement of account")) {
        inTable = true;
        continue;
      }
      if (!inTable) {
        continue;
      }
      if (rowText.contains("Opening Balance") || rowText.contains("Closing Balance")) {
        finalize(result, pendingDate, pendingAmount, pendingType, pendingDescription);
        pendingDescription.clear();
        pendingDate = null;
        pendingAmount = null;
        continue;
      }
      if (rowText.startsWith("Chq")) {
        finalize(result, pendingDate, pendingAmount, pendingType, pendingDescription);
        pendingDescription.clear();
        pendingDate = null;
        pendingAmount = null;
        continue;
      }

      String dateText = firstInColumn(row, columns.dateLower(), columns.dateUpper());
      LocalDate date = dateText != null && DATE_TOKEN.matcher(dateText).matches() ? parseDate(dateText) : null;

      if (date != null) {
        if (pendingDate != null) {
          finalize(result, pendingDate, pendingAmount, pendingType, pendingDescription);
          pendingDescription.clear();
        }

        BigDecimal credit = amountInColumn(row, columns.creditLower(), columns.creditUpper());
        BigDecimal debit = amountInColumn(row, columns.debitLower(), columns.debitUpper());

        pendingDate = date;
        if (credit != null && credit.signum() > 0) {
          pendingAmount = credit;
          pendingType = TransactionType.CREDIT;
        } else if (debit != null && debit.signum() > 0) {
          pendingAmount = debit;
          pendingType = TransactionType.DEBIT;
        } else {
          pendingAmount = null;
          pendingType = null;
        }
      }

      String desc = textInColumn(row, columns.descriptionLower(), columns.descriptionUpper());
      if (!desc.isBlank()) {
        pendingDescription.add(desc);
      }
    }

    finalize(result, pendingDate, pendingAmount, pendingType, pendingDescription);

    if (result.isEmpty()) {
      throw new StatementParseException(
          "No transaction rows could be parsed from this PDF - the layout may not be supported yet");
    }

    return result;
  }

  private void finalize(
      List<ParsedStatementRow> result,
      LocalDate date,
      BigDecimal amount,
      TransactionType type,
      List<String> descriptionLines) {
    if (date == null || amount == null) {
      return;
    }
    String description = String.join(" ", descriptionLines).trim();
    if (description.isBlank()) {
      return;
    }
    result.add(
        new ParsedStatementRow(
            date.atStartOfDay(ZONE_ID).toInstant(), MerchantNameNormalizer.normalize(description), amount, type));
  }

  private boolean isFooterDisclaimerRow(String lowerText) {
    for (String marker : DISCLAIMER_MARKERS) {
      if (lowerText.contains(marker)) return true;
    }
    return false;
  }

  private boolean isHeaderRow(Row row) {
    String text = row.text().toLowerCase(Locale.ROOT);
    return text.contains("date") && (text.contains("particulars") || text.contains("narration")) && text.contains("balance");
  }

  private String firstInColumn(Row row, float from, float to) {
    for (Token t : row.tokens) {
      if (t.x >= from && t.x < to) {
        return t.text;
      }
    }
    return null;
  }

  private String textInColumn(Row row, float from, float to) {
    StringBuilder sb = new StringBuilder();
    for (Token t : row.tokens) {
      if (t.x >= from && t.x < to) {
        if (!sb.isEmpty()) sb.append(' ');
        sb.append(t.text);
      }
    }
    return sb.toString().trim();
  }

  private BigDecimal amountInColumn(Row row, float from, float to) {
    String text = textInColumn(row, from, to);
    if (text.isBlank()) return null;
    for (String token : text.split("\\s+")) {
      if (AMOUNT_TOKEN.matcher(token).matches()) {
        return new BigDecimal(token.replace(",", ""));
      }
    }
    return null;
  }

  private LocalDate parseDate(String text) {
    for (DateTimeFormatter format : DATE_FORMATS) {
      try {
        return LocalDate.parse(text, format);
      } catch (DateTimeParseException ignored) {
        // try next format
      }
    }
    return null;
  }

  // Tokens arrive from PDFTextStripper (with sortByPosition=true) already in
  // top-to-bottom, left-to-right reading order, so this only needs to detect
  // row breaks (a y-jump beyond tolerance or a page change) rather than
  // re-sorting - re-sorting by our own guess at PDFBox's y-axis direction
  // risks scrambling an order that's already correct.
  private List<Row> groupIntoRows(List<Token> tokens) {
    List<Row> rows = new ArrayList<>();
    Row current = null;
    for (Token token : tokens) {
      if (current == null || current.page != token.page || Math.abs(current.y - token.y) > ROW_TOLERANCE) {
        current = new Row(token.page, token.y);
        rows.add(current);
      }
      current.tokens.add(token);
    }
    for (Row row : rows) {
      row.tokens.sort(Comparator.comparing(t -> t.x));
    }
    return rows;
  }

  // Column boundaries are derived from EVERY token in the header row, not
  // just the 5 semantic roles this parser cares about. That way a bank whose
  // header has extra columns in between (HDFC has "Chq./Ref.No." and "Value
  // Dt" sitting between Narration and the amount columns) gets those columns
  // carved out of the boundary space automatically, instead of their values
  // silently bleeding into whichever recognized column sits next to them.
  // Boundaries are midpoints between adjacent header tokens (not the header
  // positions themselves) because column values commonly start to the left
  // of their header label - e.g. a date value at x=26.6 under a "Date"
  // header at x=43.6.
  private Columns findColumns(List<Row> rows) {
    for (int i = 0; i < rows.size(); i++) {
      Row row = rows.get(i);
      if (row.tokens.isEmpty()) continue;

      Integer dateIdx = headerIndex(row, DATE_HEADER_ALIASES);
      Integer descIdx = headerIndex(row, DESCRIPTION_HEADER_ALIASES);
      Integer creditIdx = headerIndex(row, CREDIT_HEADER_ALIASES);
      Integer debitIdx = headerIndex(row, DEBIT_HEADER_ALIASES);
      Integer balanceIdx = headerIndex(row, BALANCE_HEADER_ALIASES);

      if (dateIdx == null || descIdx == null || creditIdx == null || debitIdx == null || balanceIdx == null) {
        continue;
      }

      // Some banks split a column's header into two tokens ("Withdrawal" +
      // "Amt.") where the trailing word - not the first - is what actually
      // sits above the real data (confirmed empirically: a "299.00" value
      // landed at x=448.2, almost exactly under "Amt." at x=448.7, while
      // "Withdrawal" itself sits at x=405.3, well to the left of the real
      // column). Shift onto that trailing word when present so the boundary
      // is computed from where the data actually is.
      creditIdx = shiftPastContinuation(row, creditIdx);
      debitIdx = shiftPastContinuation(row, debitIdx);
      balanceIdx = shiftPastContinuation(row, balanceIdx);

      float[] dateBounds = bounds(row.tokens, dateIdx);
      float[] descBounds = bounds(row.tokens, descIdx);
      float[] creditBounds = bounds(row.tokens, creditIdx);
      float[] debitBounds = bounds(row.tokens, debitIdx);
      float[] balanceBounds = bounds(row.tokens, balanceIdx);

      // The description/narration header can sit much further right than
      // where the free-text data actually starts (observed: "Narration" at
      // x=144 while real narration text starts at x=72, right after the
      // date column) - single-word amount headers don't have this problem
      // but a long descriptive label apparently can. Rather than trust the
      // header position here, find a real transaction row and use the token
      // immediately following its date value to widen the lower bound if
      // needed. Only the lower bound is touched - the upper bound stays
      // derived from the header row, since narrowing it the same way
      // truncated legitimate narration text on banks where the header
      // position was already accurate (confirmed against a real Canara
      // e-Passbook: shifting both bounds together cut names down to a
      // handful of characters).
      Float empiricalDescX = findEmpiricalDescriptionX(rows, i);
      if (empiricalDescX != null && empiricalDescX < descBounds[0]) {
        descBounds[0] = empiricalDescX;
      }

      return new Columns(dateBounds, descBounds, creditBounds, debitBounds, balanceBounds);
    }
    throw new StatementParseException(
        "Could not find a recognizable header row (need Date, Particulars/Narration, Deposit/Credit, Withdrawal/Debit and Balance columns)");
  }

  private Integer shiftPastContinuation(Row row, Integer idx) {
    if (idx == null || idx + 1 >= row.tokens.size()) return idx;
    String next = row.tokens.get(idx + 1).text.toLowerCase(Locale.ROOT).replace(".", "").trim();
    return next.equals("amt") ? idx + 1 : idx;
  }

  // Scans rows after the header for ones carrying both a valid date and an
  // amount (i.e. genuine transaction rows, not stray page-header repeats),
  // and returns the SMALLEST x-position seen for whatever token immediately
  // follows the date value. A single sample row isn't reliable enough - two
  // real transaction rows in the same real-world statement had their
  // narration start 4pt apart (68.0 vs 72.0), enough for a single-sample
  // anchor to exclude the other one entirely - so this takes the minimum
  // across several rows to make sure every real narration start is covered.
  private Float findEmpiricalDescriptionX(List<Row> rows, int headerRowIdx) {
    Float min = null;
    int sampled = 0;
    for (int i = headerRowIdx + 1; i < rows.size() && sampled < 25; i++) {
      Row row = rows.get(i);
      boolean hasAmount = row.tokens.stream().anyMatch(t -> AMOUNT_TOKEN.matcher(t.text).matches());
      if (!hasAmount) continue;
      for (int t = 0; t < row.tokens.size(); t++) {
        if (DATE_TOKEN.matcher(row.tokens.get(t).text).matches() && t + 1 < row.tokens.size()) {
          float x = row.tokens.get(t + 1).x;
          if (min == null || x < min) min = x;
          sampled++;
          break;
        }
      }
    }
    return min;
  }

  private float[] bounds(List<Token> tokens, int index) {
    float x = tokens.get(index).x;
    float lower = index == 0 ? -Float.MAX_VALUE : midpoint(tokens.get(index - 1).x, x);
    float upper = index == tokens.size() - 1 ? Float.MAX_VALUE : midpoint(x, tokens.get(index + 1).x);
    return new float[] {lower, upper};
  }

  private float midpoint(float a, float b) {
    return (a + b) / 2f;
  }

  // Header aliases are matched by substring, not exact equality, since banks
  // phrase the same column differently ("Deposits" vs "Deposit Amt.",
  // "Balance" vs "Closing Balance") and PDFBox may or may not split a header
  // label like "Withdrawal Amt." into separate tokens. This only needs to be
  // safe for finding THE header row, which additionally requires all 5 roles
  // to match within the same row - individual false positives elsewhere
  // don't matter.
  private Integer headerIndex(Row row, List<String> aliases) {
    for (int i = 0; i < row.tokens.size(); i++) {
      String normalized = row.tokens.get(i).text.toLowerCase(Locale.ROOT).replace(":", "").replace(".", "").trim();
      for (String alias : aliases) {
        if (normalized.contains(alias)) {
          return i;
        }
      }
    }
    return null;
  }

  private record Token(int page, float x, float y, String text) {}

  private static final class Row {
    final int page;
    final float y;
    final List<Token> tokens = new ArrayList<>();

    Row(int page, float y) {
      this.page = page;
      this.y = y;
    }

    String text() {
      StringBuilder sb = new StringBuilder();
      for (Token t : tokens) {
        if (!sb.isEmpty()) sb.append(' ');
        sb.append(t.text);
      }
      return sb.toString().trim();
    }
  }

  // Each column is [lower, upper) bounds derived from its neighbors in the
  // full header row - see findColumns().
  private record Columns(float[] date, float[] description, float[] credit, float[] debit, float[] balance) {
    float dateLower() {
      return date[0];
    }

    float dateUpper() {
      return date[1];
    }

    float descriptionLower() {
      return description[0];
    }

    float descriptionUpper() {
      return description[1];
    }

    float creditLower() {
      return credit[0];
    }

    float creditUpper() {
      return credit[1];
    }

    float debitLower() {
      return debit[0];
    }

    float debitUpper() {
      return debit[1];
    }
  }

  private static final class TableCapturingStripper extends PDFTextStripper {
    final List<Token> tokens = new ArrayList<>();
    private int currentPage = 0;

    TableCapturingStripper() throws IOException {
      super();
    }

    @Override
    protected void startPage(org.apache.pdfbox.pdmodel.PDPage page) throws IOException {
      currentPage++;
      super.startPage(page);
    }

    @Override
    protected void writeString(String text, List<TextPosition> textPositions) {
      if (text == null || text.isBlank() || textPositions.isEmpty()) {
        return;
      }
      TextPosition first = textPositions.get(0);
      tokens.add(new Token(currentPage, first.getXDirAdj(), first.getYDirAdj(), text.trim()));
    }
  }
}
