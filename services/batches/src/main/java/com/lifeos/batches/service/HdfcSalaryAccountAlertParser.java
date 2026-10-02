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
              + ") (?:is|has been|was)(?: successfully)? (debited|credited)",
          Pattern.CASE_INSENSITIVE);

  private static final Pattern DATE = Pattern.compile("(?:\\bon |\\bDate:\\s*)(\\d{2}[-/]\\d{2}[-/]\\d{2,4})");
  private static final Pattern ACCOUNT = Pattern.compile("account ending(?: in)? (\\S+)", Pattern.CASE_INSENSITIVE);
  /** "Sender: NAME (VPA: handle@bank)" in the newer credit mails. */
  private static final Pattern SENDER =
      Pattern.compile("(?:Sender|Beneficiary|Paid to|Receiver):\\s*(.+?)(?:\\s*\\(VPA:\\s*(\\S+?)\\))?\\s+(?:[a-z]\\. |Need Help|$)", Pattern.CASE_INSENSITIVE);
  /** Debit-card mails: "Debit Card ending 5480 for ATM withdrawal for Rs 19600.00 in CHENNAI at X BRANCH on 06-07-2026". */
  private static final Pattern CARD_SPEND =
      Pattern.compile(
          "Debit Card ending \\d+ for (.+?) for (?:Rs\\.?|INR)\\s?(" + AlertFormat.AMOUNT + ")(?: in (.+?))? on (\\d{2}[-/]\\d{2}[-/]\\d{2,4})",
          Pattern.CASE_INSENSITIVE);
  private static final Pattern VPA = Pattern.compile("towards VPA (\\S+)(?: \\(([^)]+)\\))?");
  private static final Pattern INFO = Pattern.compile("(?:Info|Narration|Remarks)[:\\s-]+([^\\r\\n.]+)", Pattern.CASE_INSENSITIVE);
  private static final Pattern CHANNEL = Pattern.compile("\\b(NEFT|IMPS|RTGS|ACH|NACH|SALARY)\\b", Pattern.CASE_INSENSITIVE);

  @Override
  public ParsedAlert parse(
      String messageId, String fromAddress, String subject, String body, Instant receivedAt) {
    Matcher cardSpend = CARD_SPEND.matcher(body);
    if (cardSpend.find()) {
      // The digits in these mails are the debit card's, not the account's, so no suffix is passed on:
      // matching on them would reject the savings account.
      String where = cardSpend.group(3) == null ? "" : " - " + cardSpend.group(3).trim();
      return new ParsedAlert(
          "HDFC Bank",
          AccountType.SAVINGS,
          AlertFormat.amount(cardSpend.group(2)),
          TransactionType.DEBIT,
          AlertFormat.date(cardSpend.group(4)),
          capitalise(cardSpend.group(1).trim()) + where,
          messageId,
          null);
    }

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

  private static String capitalise(String text) {
    return text.isEmpty() ? text : Character.toUpperCase(text.charAt(0)) + text.substring(1);
  }

  private static String counterparty(String body, TransactionType type) {
    Matcher sender = SENDER.matcher(body);
    if (sender.find()) {
      String name = sender.group(1).trim();
      return sender.group(2) == null ? name : name + " (" + sender.group(2) + ")";
    }
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
