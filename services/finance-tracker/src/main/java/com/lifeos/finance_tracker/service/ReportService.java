package com.lifeos.finance_tracker.service;

import com.lifeos.finance_tracker.domains.entity.Transaction;
import com.lifeos.finance_tracker.repository.TransactionRepository;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
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

  private final TransactionRepository transactionRepository;

  public byte[] exportTaxYear(Authentication authentication, int year) {
    UUID userId = (UUID) authentication.getPrincipal();

    Instant start = LocalDate.of(year, 1, 1).atStartOfDay(ZONE_ID).toInstant();
    Instant end = LocalDate.of(year + 1, 1, 1).atStartOfDay(ZONE_ID).toInstant();

    List<Transaction> transactions =
        transactionRepository.findAllByUserIdAndTransactionDateBetweenOrderByTransactionDateAsc(
            userId, start, end);

    StringBuilder csv = new StringBuilder("Date,Description,Category,Amount,Type\n");

    for (Transaction t : transactions) {
      csv.append(t.getTransactionDate())
          .append(",")
          .append(escapeCsv(t.getDescription()))
          .append(",")
          .append(t.getCategoryId() == null ? "" : t.getCategoryId())
          .append(",")
          .append(t.getAmount())
          .append(",")
          .append(t.getType())
          .append("\n");
    }

    return csv.toString().getBytes(StandardCharsets.UTF_8);
  }

  public byte[] generateCustomReport(Authentication authentication, LocalDate startDate, LocalDate endDate) {
    UUID userId = (UUID) authentication.getPrincipal();

    Instant start = startDate.atStartOfDay(ZONE_ID).toInstant();
    Instant end = endDate.plusDays(1).atStartOfDay(ZONE_ID).toInstant();

    List<Transaction> transactions =
        transactionRepository.findAllByUserIdAndTransactionDateBetweenOrderByTransactionDateAsc(
            userId, start, end);

    Map<UUID, BigDecimal> categoryTotals =
        transactions.stream()
            .filter(t -> t.getCategoryId() != null)
            .collect(
                Collectors.groupingBy(
                    Transaction::getCategoryId,
                    Collectors.reducing(BigDecimal.ZERO, Transaction::getAmount, BigDecimal::add)));

    StringBuilder html = new StringBuilder("<html><body><h1>Report</h1><table border='1'>");
    html.append("<tr><th>Category</th><th>Total</th></tr>");

    for (Map.Entry<UUID, BigDecimal> entry : categoryTotals.entrySet()) {
      html.append("<tr><td>")
          .append(entry.getKey())
          .append("</td><td>")
          .append(entry.getValue())
          .append("</td></tr>");
    }

    html.append("</table></body></html>");

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
