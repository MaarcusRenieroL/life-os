package com.lifeos.batches.service;

import com.lifeos.batches.domains.enums.AccountType;
import com.lifeos.batches.domains.enums.TransactionType;
import com.lifeos.batches.domains.record.ParsedAlert;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

/**
 * HDFC savings-account alerts. UPI debits name a VPA; salary and other bank credits (NEFT, IMPS,
 * ACH) usually don't, so the counterparty falls back to the transfer channel.
 */
@Service
public class HdfcSalaryAccountAlertParser implements BankAlertParser {

  private static final Pattern MOVEMENT =
      Pattern.compile(
          "(?:Rs\\.?|INR)\\s?("
              + AlertFormat.AMOUNT
              + ") (?:is|has been|was) (debited|credited)",
          Pattern.CASE_INSENSITIVE);

  private static final Pattern DATE = Pattern.compile("\\bon (\\d{2}[-/]\\d{2}[-/]\\d{2,4})");
  private static final Pattern ACCOUNT = Pattern.compile("account ending (\\S+)", Pattern.CASE_INSENSITIVE);
  private static final Pattern VPA = Pattern.compile("towards VPA (\\S+)(?: \\(([^)]+)\\))?");
  private static final Pattern INFO = Pattern.compile("(?:Info|Narration|Remarks)[:\\s-]+([^\\r\\n.]+)", Pattern.CASE_INSENSITIVE);
  private static final Pattern CHANNEL = Pattern.compile("\\b(NEFT|IMPS|RTGS|ACH|NACH|SALARY)\\b", Pattern.CASE_INSENSITIVE);

  @Override
  public ParsedAlert parse(
      String messageId, String fromAddress, String subject, String body, Instant receivedAt) {
    Matcher movement = MOVEMENT.matcher(body);
    Matcher date = DATE.matcher(body);
    if (!movement.find() || !date.find()) {
      throw AlertFormat.unparsed(fromAddress, subject);
    }

    BigDecimal amount = AlertFormat.amount(movement.group(1));
    TransactionType type =
        movement.group(2).equalsIgnoreCase("debited") ? TransactionType.DEBIT : TransactionType.CREDIT;

    Matcher account = ACCOUNT.matcher(body);

    return new ParsedAlert(
        "HDFC Bank",
        AccountType.SAVINGS,
        amount,
        type,
        AlertFormat.date(date.group(1)),
        counterparty(body, type),
        messageId,
        account.find() ? AlertFormat.suffix(account.group(1)) : null);
  }

  private static String counterparty(String body, TransactionType type) {
    Matcher vpa = VPA.matcher(body);
    if (vpa.find()) {
      return vpa.group(1).trim();
    }
    Matcher info = INFO.matcher(body);
    if (info.find()) {
      return info.group(1).trim();
    }
    Matcher channel = CHANNEL.matcher(body);
    String via = channel.find() ? channel.group(1).toUpperCase() : "bank transfer";
    return (type == TransactionType.CREDIT ? "Credit via " : "Debit via ") + via;
  }

  @Override
  public boolean supports(String fromAddress) {
    return fromAddress.contains("alerts@hdfcbank.bank.in");
  }
}
