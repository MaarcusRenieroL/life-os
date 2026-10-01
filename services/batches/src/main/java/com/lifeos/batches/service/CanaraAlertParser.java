package com.lifeos.batches.service;

import com.lifeos.batches.domains.enums.AccountType;
import com.lifeos.batches.domains.enums.TransactionType;
import com.lifeos.batches.domains.record.ParsedAlert;
import java.time.Instant;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

/**
 * Canara Bank alerts. Three shapes are in use:
 * <ul>
 *   <li>UPI/IMPS debit: "An amount of INR X has been DEBITED on d from your account A to P with UPI Ref No"
 *   <li>UPI/IMPS credit: "... has been CREDITED on d to your account A from P with UPI Ref No" (the
 *       account and counterparty come in the opposite order)
 *   <li>Loan account credit: "Your Loan account no. A has been credited with amount Rs. INR X" - no date
 *       in the mail, so the day it was received is used
 * </ul>
 */
@Service
public class CanaraAlertParser implements BankAlertParser {

  private static final Pattern DEBIT =
      Pattern.compile(
          "An amount of INR (" + AlertFormat.AMOUNT + ") has been (?i:DEBITED) on (\\d{2}/\\d{2}/\\d{2,4}) from your"
              + " account (\\S+) to (.+?) with UPI Ref No");

  private static final Pattern CREDIT =
      Pattern.compile(
          "An amount of INR (" + AlertFormat.AMOUNT + ") has been (?i:CREDITED) on (\\d{2}/\\d{2}/\\d{2,4}) to your"
              + " account (\\S+) from (.+?) with UPI Ref No");

  private static final Pattern LOAN_CREDIT =
      Pattern.compile(
          "Loan account no\\.?\\s*(\\S+) has been credited with amount (?:Rs\\.?\\s*)?(?:INR\\s*)?(" + AlertFormat.AMOUNT + ")",
          Pattern.CASE_INSENSITIVE);

  @Override
  public ParsedAlert parse(
      String messageId, String fromAddress, String subject, String body, Instant receivedAt) {
    Matcher debit = DEBIT.matcher(body);
    if (debit.find()) {
      return alert(debit.group(1), TransactionType.DEBIT, AlertFormat.date(debit.group(2)), debit.group(4), debit.group(3), messageId);
    }

    Matcher credit = CREDIT.matcher(body);
    if (credit.find()) {
      return alert(credit.group(1), TransactionType.CREDIT, AlertFormat.date(credit.group(2)), credit.group(4), credit.group(3), messageId);
    }

    Matcher loan = LOAN_CREDIT.matcher(body);
    if (loan.find()) {
      return alert(loan.group(2), TransactionType.CREDIT, AlertFormat.dayOf(receivedAt), "Loan account credit", loan.group(1), messageId);
    }

    throw AlertFormat.unparsed(fromAddress, subject);
  }

  private static ParsedAlert alert(
      String amount, TransactionType type, Instant date, String counterparty, String account, String messageId) {
    return new ParsedAlert(
        "Canara Bank", AccountType.SAVINGS, AlertFormat.amount(amount), type, date, counterparty.trim(), messageId, AlertFormat.suffix(account));
  }

  @Override
  public boolean supports(String fromAddress) {
    return fromAddress.contains("canarabank@canarabank.com");
  }
}
