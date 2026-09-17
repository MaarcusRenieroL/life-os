package com.lifeos.batches.service;

import com.lifeos.batches.domains.enums.AccountType;
import com.lifeos.batches.domains.enums.TransactionType;
import com.lifeos.batches.domains.record.ParsedAlert;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

@Service
public class HdfcSalaryAccountAlertParser implements BankAlertParser {

  @Override
  public ParsedAlert parse(
      String messageId, String fromAddress, String subject, String body, Instant receivedAt) {
    String regex =
        "Rs\\.([\\d.]+) is (debited|credited) from your account ending \\d+ towards VPA (\\S+)"
            + " \\([^)]+\\) on (\\d{2}-\\d{2}-\\d{2})";

    Pattern pattern = Pattern.compile(regex);
    Matcher matcher = pattern.matcher(body);

    if (!matcher.find()) {
      throw new IllegalStateException();
    }

    BigDecimal amount = new BigDecimal(matcher.group(1));
    TransactionType transactionType =
        matcher.group(2).equalsIgnoreCase("debited") ? TransactionType.DEBIT : TransactionType.CREDIT;
    Instant transactionDate =
        LocalDate.parse(matcher.group(4), DateTimeFormatter.ofPattern("dd-MM-yy"))
            .atStartOfDay(ZoneId.of("Asia/Kolkata"))
            .toInstant();

    return new ParsedAlert(
        "HDFC Bank",
        AccountType.SAVINGS,
        amount,
        transactionType,
        transactionDate,
        matcher.group(3).trim(),
        messageId);
  }

  @Override
  public boolean supports(String fromAddress) {
    return fromAddress.contains("alerts@hdfcbank.bank.in");
  }
}
