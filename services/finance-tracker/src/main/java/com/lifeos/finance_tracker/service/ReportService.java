package com.lifeos.finance_tracker.service;

import com.lifeos.finance_tracker.domains.entity.Category;
import com.lifeos.finance_tracker.domains.entity.Transaction;
import com.lifeos.finance_tracker.domains.entity.UserFinanceSettings;
import com.lifeos.finance_tracker.domains.enums.TransactionType;
import com.lifeos.finance_tracker.repository.CategoryRepository;
import com.lifeos.finance_tracker.repository.TransactionRepository;
import com.lifeos.finance_tracker.repository.UserFinanceSettingsRepository;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Period;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ReportService {

  private static final ZoneId ZONE_ID = ZoneId.of("Asia/Kolkata");
  private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd-MMM-yyyy");

  private final TransactionRepository transactionRepository;
  private final CategoryRepository categoryRepository;
  private final UserFinanceSettingsRepository userFinanceSettingsRepository;

  // Indian financial year: `year` is the FY start year, e.g. 2025 means
  // FY 2025-26 (1 Apr 2025 - 31 Mar 2026) - matches how ITR filing periods work,
  // unlike a plain calendar year.
  public byte[] exportTaxYear(Authentication authentication, int year) {
    UUID userId = (UUID) authentication.getPrincipal();

    Instant start = LocalDate.of(year, 4, 1).atStartOfDay(ZONE_ID).toInstant();
    Instant end = LocalDate.of(year + 1, 4, 1).atStartOfDay(ZONE_ID).toInstant();

    List<Transaction> transactions =
        transactionRepository.findAllByUserIdAndTransactionDateBetweenOrderByTransactionDateAsc(
            userId, start, end);

    Map<UUID, String> categoryNames = categoryNamesFor(userId);

    StringBuilder csv =
        new StringBuilder("Financial Year,Date,Description,Category,Type,Amount,Notes\n");
    String fyLabel = "FY " + year + "-" + String.valueOf(year + 1).substring(2);

    for (Transaction t : transactions) {
      csv.append(fyLabel)
          .append(",")
          .append(DATE_FORMAT.format(t.getTransactionDate().atZone(ZONE_ID)))
          .append(",")
          .append(escapeCsv(t.getDescription()))
          .append(",")
          .append(escapeCsv(categoryNames.getOrDefault(t.getCategoryId(), "Uncategorized")))
          .append(",")
          .append(t.getType())
          .append(",")
          .append(t.getAmount())
          .append(",")
          .append(escapeCsv(t.getNotes()))
          .append("\n");
    }

    BigDecimal totalCredits = sumByType(transactions, TransactionType.CREDIT);
    BigDecimal totalExpenses = sumByType(transactions, TransactionType.DEBIT);
    BigDecimal totalIncome = fixedIncomeFor(userId, 12);
    csv.append("\nTotal Income (fixed salary x 12),,,,,")
        .append(totalIncome)
        .append(",\n")
        .append("Total Expenses,,,,,")
        .append(totalExpenses)
        .append(",\n")
        .append("Total Credits (transfers/refunds - not income),,,,,")
        .append(totalCredits)
        .append(",\n");

    return csv.toString().getBytes(StandardCharsets.UTF_8);
  }

  public byte[] generateCustomReport(
      Authentication authentication, LocalDate startDate, LocalDate endDate) {
    UUID userId = (UUID) authentication.getPrincipal();

    Instant start = startDate.atStartOfDay(ZONE_ID).toInstant();
    Instant end = endDate.plusDays(1).atStartOfDay(ZONE_ID).toInstant();

    List<Transaction> transactions =
        transactionRepository.findAllByUserIdAndTransactionDateBetweenOrderByTransactionDateAsc(
            userId, start, end);

    Map<UUID, String> categoryNames = categoryNamesFor(userId);

    Map<String, List<Transaction>> byCategory =
        transactions.stream()
            .collect(
                Collectors.groupingBy(
                    t ->
                        t.getCategoryId() == null
                            ? "Uncategorized"
                            : categoryNames.getOrDefault(t.getCategoryId(), "Uncategorized")));

    BigDecimal totalCredits = sumByType(transactions, TransactionType.CREDIT);
    BigDecimal totalExpenses = sumByType(transactions, TransactionType.DEBIT);
    int monthsInRange = Math.max(1, (int) Period.between(startDate, endDate.plusDays(1)).toTotalMonths());
    BigDecimal totalIncome = fixedIncomeFor(userId, monthsInRange);

    StringBuilder html = new StringBuilder();
    html.append("<html><head><style>")
        .append(
            "body{font-family:sans-serif;font-size:12px;color:#111;}"
                + "h1{font-size:20px;margin-bottom:0;}"
                + "p.sub{color:#555;margin-top:4px;}"
                + "table{width:100%;border-collapse:collapse;margin-bottom:20px;}"
                + "th,td{border:1px solid #ccc;padding:6px 8px;text-align:left;}"
                + "th{background:#f0f0f0;}"
                + "td.amount{text-align:right;}"
                + "h2{font-size:14px;margin-top:26px;margin-bottom:8px;border-bottom:1px solid #ccc;padding-bottom:4px;}"
                + ".summary{display:table;width:100%;margin-bottom:16px;}"
                + ".summary div{display:table-cell;padding:8px;}")
        .append("</style></head><body>");

    html.append("<h1>Finance Report</h1>")
        .append("<p class='sub'>")
        .append(DATE_FORMAT.format(startDate.atStartOfDay(ZONE_ID)))
        .append(" &ndash; ")
        .append(DATE_FORMAT.format(endDate.atStartOfDay(ZONE_ID)))
        .append("</p>");

    html.append("<div class='summary'>")
        .append("<div><strong>Income:</strong> ")
        .append(totalIncome)
        .append("</div><div><strong>Expenses:</strong> ")
        .append(totalExpenses)
        .append("</div><div><strong>Net:</strong> ")
        .append(totalIncome.subtract(totalExpenses))
        .append("</div><div><strong>Credits (transfers/refunds, not income):</strong> ")
        .append(totalCredits)
        .append("</div></div>");

    html.append("<h2>Summary by category</h2>");
    html.append("<table><tr><th>Category</th><th>Transactions</th><th>Total</th></tr>");
    for (Map.Entry<String, List<Transaction>> entry :
        byCategory.entrySet().stream()
            .sorted(
                Comparator.comparing(
                    (Map.Entry<String, List<Transaction>> e) -> categoryTotal(e.getValue()))
                    .reversed())
            .toList()) {
      html.append("<tr><td>")
          .append(entry.getKey())
          .append("</td><td>")
          .append(entry.getValue().size())
          .append("</td><td class='amount'>")
          .append(categoryTotal(entry.getValue()))
          .append("</td></tr>");
    }
    html.append("</table>");

    html.append("<h2>Transaction detail</h2>");
    for (Map.Entry<String, List<Transaction>> entry :
        byCategory.entrySet().stream()
            .sorted(
                Comparator.comparing(
                    (Map.Entry<String, List<Transaction>> e) -> categoryTotal(e.getValue()))
                    .reversed())
            .toList()) {
      html.append("<h3>")
          .append(entry.getKey())
          .append(" &mdash; ")
          .append(categoryTotal(entry.getValue()))
          .append("</h3>");
      html.append(
          "<table><tr><th>Date</th><th>Description</th><th>Type</th><th>Amount</th><th>Reason / notes</th></tr>");
      for (Transaction t : entry.getValue()) {
        html.append("<tr><td>")
            .append(DATE_FORMAT.format(t.getTransactionDate().atZone(ZONE_ID)))
            .append("</td><td>")
            .append(t.getDescription())
            .append("</td><td>")
            .append(t.getType())
            .append("</td><td class='amount'>")
            .append(t.getAmount())
            .append("</td><td>")
            .append(reasonFor(t))
            .append("</td></tr>");
      }
      html.append("</table>");
    }

    html.append("</body></html>");

    ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
    PdfRendererBuilder builder = new PdfRendererBuilder();
    builder.useFastMode();
    builder.withHtmlContent(html.toString(), null);
    builder.toStream(outputStream);

    try {
      builder.run();
    } catch (Exception e) {
      throw new RuntimeException("Failed to generate PDF report", e);
    }

    return outputStream.toByteArray();
  }

  private String reasonFor(Transaction t) {
    if (t.getNotes() != null && !t.getNotes().isBlank()) {
      return t.getNotes();
    }
    if (t.getDisputeReason() != null && !t.getDisputeReason().isBlank()) {
      return "Disputed: " + t.getDisputeReason();
    }
    if (t.isCategoryManuallySet()) {
      return "Manually categorized";
    }
    return switch (t.getSourceType()) {
      case EMAIL_ALERT -> "Auto-detected from email alert";
      case CSV_IMPORT -> "Auto-categorized from statement import";
      case MANUAL_ENTRY -> "Manually entered";
      case API -> "Imported via API";
    };
  }

  private BigDecimal categoryTotal(List<Transaction> transactions) {
    return transactions.stream()
        .filter(t -> t.getType() == TransactionType.DEBIT)
        .map(Transaction::getAmount)
        .reduce(BigDecimal.ZERO, BigDecimal::add);
  }

  // Income for a report is the user's fixed monthly salary times however many
  // months the report spans - not a sum of CREDIT transactions, which include
  // one-off transfers/refunds that aren't real income.
  private BigDecimal fixedIncomeFor(UUID userId, int months) {
    return userFinanceSettingsRepository
        .findById(userId)
        .map(UserFinanceSettings::getMonthlyIncome)
        .map(monthly -> monthly.multiply(BigDecimal.valueOf(months)))
        .orElse(BigDecimal.ZERO);
  }

  private BigDecimal sumByType(List<Transaction> transactions, TransactionType type) {
    return transactions.stream()
        .filter(t -> t.getType() == type)
        .map(Transaction::getAmount)
        .reduce(BigDecimal.ZERO, BigDecimal::add);
  }

  private Map<UUID, String> categoryNamesFor(UUID userId) {
    return categoryRepository.findAllByUserIdOrUserIdIsNull(userId).stream()
        .collect(Collectors.toMap(Category::getId, Category::getName));
  }

  private String escapeCsv(String field) {
    if (field == null) {
      return "";
    }

    if (field.contains(",") || field.contains("\"")) {
      return "\"" + field.replace("\"", "\"\"") + "\"";
    }

    return field;
  }
}
