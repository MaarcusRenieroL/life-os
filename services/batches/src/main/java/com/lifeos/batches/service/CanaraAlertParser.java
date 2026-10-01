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
public class CanaraAlertParser implements BankAlertParser {

  @Override
  public ParsedAlert parse(
      String messageId, String fromAddress, String subject, String body, Instant receivedAt) {
    String regex =
        "An amount of INR (" + AlertFormat.AMOUNT + ") has been ((?i:DEBITED|CREDITED)) on (\\d{2}/\\d{2}/\\d{2,4}) from your"
            + " account (\\S+) to (.+?) with UPI Ref No\\.:(\\d+)";

    Pattern pattern = Pattern.compile(regex);
    Matcher matcher = pattern.matcher(body);

    if (!matcher.find()) {
      throw AlertFormat.unparsed(fromAddress, subject);
    }

    BigDecimal amount = AlertFormat.amount(matcher.group(1));
    TransactionType transactionType =
        matcher.group(2).equalsIgnoreCase("DEBITED") ? TransactionType.DEBIT : TransactionType.CREDIT;
    Instant transactionDate =
        AlertFormat.date(matcher.group(3));

    return new ParsedAlert(
        "Canara Bank",
        AccountType.SAVINGS,
        amount,
        transactionType,
        transactionDate,
        matcher.group(5).trim(),
        messageId);
  }

  @Override
  public boolean supports(String fromAddress) {
    return fromAddress.contains("canarabank@canarabank.com");
  }
}
