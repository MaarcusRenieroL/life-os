package com.lifeos.batches.service;

import com.lifeos.batches.domains.enums.AccountType;
import com.lifeos.batches.domains.enums.TransactionType;
import com.lifeos.batches.domains.record.ParsedAlert;
import java.time.Instant;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

/**
 * HDFC credit-card alerts: a purchase ("transaction of Rs. X at M on d at t") and a payment towards the
 * card ("We have received payment of INR X on your <card> credit card on d t"), which is money
 * coming in against the card's balance, not spending.
 */
@Service
public class HdfcCreditCardAlertParser implements BankAlertParser {

  private static final String CURRENCY = "(?:Rs\\.?|INR)\\s?";

  private static final Pattern PURCHASE =
      Pattern.compile("transaction of " + CURRENCY + "(" + AlertFormat.AMOUNT + ") at (.+?) on (\\d{2}/\\d{2}/\\d{2,4}) at");

  private static final Pattern PAYMENT =
      Pattern.compile("received payment of " + CURRENCY + "(" + AlertFormat.AMOUNT + ") on your (.+?) credit card on (\\d{2}/\\d{2}/\\d{2,4})");

  @Override
  public ParsedAlert parse(
      String messageId, String fromAddress, String subject, String body, Instant receivedAt) {
    Matcher purchase = PURCHASE.matcher(body);
    if (purchase.find()) {
      return new ParsedAlert(
          "HDFC Bank", AccountType.CREDIT_CARD, AlertFormat.amount(purchase.group(1)), TransactionType.DEBIT,
          AlertFormat.date(purchase.group(3)), purchase.group(2).trim(), messageId, null);
    }

    Matcher payment = PAYMENT.matcher(body);
    if (payment.find()) {
      return new ParsedAlert(
          "HDFC Bank", AccountType.CREDIT_CARD, AlertFormat.amount(payment.group(1)), TransactionType.CREDIT,
          AlertFormat.date(payment.group(3)), "Card payment received", messageId, null);
    }

    throw AlertFormat.unparsed(fromAddress, subject);
  }

  @Override
  public boolean supports(String fromAddress) {
    return fromAddress.contains("alerts@hdfcbank.net");
  }
}
