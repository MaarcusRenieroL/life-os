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
public class HdfcCreditCardAlertParser implements BankAlertParser {

  @Override
  public ParsedAlert parse(
      String messageId, String fromAddress, String subject, String body, Instant receivedAt) {
    String regex = "transaction of Rs\\. ([\\d.]+) at (.+?) on (\\d{2}/\\d{2}/\\d{2}) at";

    Pattern pattern = Pattern.compile(regex);
    Matcher matcher = pattern.matcher(body);

    if (!matcher.find()) {
      throw new IllegalStateException();
    }

    BigDecimal amount = new BigDecimal(matcher.group(1));
    Instant transactionDate =
        LocalDate.parse(matcher.group(3), DateTimeFormatter.ofPattern("dd/MM/yy"))
            .atStartOfDay(ZoneId.of("Asia/Kolkata"))
            .toInstant();

    return new ParsedAlert(
        "HDFC Bank",
        AccountType.CREDIT_CARD,
        amount,
        TransactionType.DEBIT,
        transactionDate,
        matcher.group(2).trim(),
        messageId);
  }

  @Override
  public boolean supports(String fromAddress) {
    return fromAddress.contains("alerts@hdfcbank.net");
  }
}
