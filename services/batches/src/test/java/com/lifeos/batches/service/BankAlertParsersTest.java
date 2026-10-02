package com.lifeos.batches.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.lifeos.batches.domains.enums.TransactionType;
import com.lifeos.batches.domains.record.ParsedAlert;
import java.math.BigDecimal;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class BankAlertParsersTest {

  private static final Instant NOW = Instant.parse("2026-09-30T00:00:00Z");

  private final HdfcSalaryAccountAlertParser salary = new HdfcSalaryAccountAlertParser();
  private final HdfcCreditCardAlertParser card = new HdfcCreditCardAlertParser();
  private final CanaraAlertParser canara = new CanaraAlertParser();

  @Test
  void upiDebitStillParses() {
    ParsedAlert alert =
        salary.parse(
            "m1",
            "alerts@hdfcbank.bank.in",
            "UPI",
            "Rs.499.00 is debited from your account ending 2277 towards VPA swiggy@icici (Swiggy) on 12-09-26",
            NOW);

    assertThat(alert.amount()).isEqualByComparingTo("499.00");
    assertThat(alert.type()).isEqualTo(TransactionType.DEBIT);
    assertThat(alert.description()).isEqualTo("swiggy@icici");
  }

  @Test
  void salaryCreditWithThousandsSeparatorsParses() {
    ParsedAlert alert =
        salary.parse(
            "m2",
            "alerts@hdfcbank.bank.in",
            "Credit",
            "Rs. 1,25,000.00 has been credited to your account ending 2277 by NEFT on 30-09-2026.",
            NOW);

    assertThat(alert.amount()).isEqualByComparingTo(new BigDecimal("125000.00"));
    assertThat(alert.type()).isEqualTo(TransactionType.CREDIT);
    assertThat(alert.description()).isEqualTo("Credit via NEFT");
  }

  @Test
  void creditCardAmountWithCommasParses() {
    ParsedAlert alert =
        card.parse(
            "m3",
            "alerts@hdfcbank.net",
            "Card",
            "transaction of Rs. 12,500.50 at AMAZON on 12/09/26 at 10:00",
            NOW);

    assertThat(alert.amount()).isEqualByComparingTo("12500.50");
    assertThat(alert.type()).isEqualTo(TransactionType.DEBIT);
  }

  @Test
  void canaraCreditParses() {
    ParsedAlert alert =
        canara.parse(
            "m4",
            "canarabank@canarabank.com",
            "UPI",
            "An amount of INR 1,250.00 has been CREDITED on 12/09/26 to your account XX1234 from Ravi K with UPI Ref No.:123456",
            NOW);

    assertThat(alert.amount()).isEqualByComparingTo("1250.00");
    assertThat(alert.type()).isEqualTo(TransactionType.CREDIT);
    assertThat(alert.description()).isEqualTo("Ravi K");
  }

  @Test
  void unknownFormatSaysWhatItSawInsteadOfAnEmptyException() {
    assertThatThrownBy(
            () -> salary.parse("m5", "alerts@hdfcbank.bank.in", "Statement ready", "Your e-statement is ready", NOW))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("Statement ready");
  }

  // ---- the formats seen in a real inbox ------------------------------------------------------

  @Test
  void canaraUpiCreditPutsTheAccountBeforeTheSender() {
    ParsedAlert alert =
        canara.parse(
            "m6",
            "canarabank@canarabank.com",
            "UPI/IMPS/MB Transaction Alert",
            "Dear Customer, Thanking you for banking with Canara Bank. An amount of INR 40,000.00 has been CREDITED on 30/09/26"
                + " to your account XXXX7829 from MAARCUS RENI with UPI Ref No.:663937859272. Total Available Balance INR 40,057.17.",
            NOW);

    assertThat(alert.amount()).isEqualByComparingTo("40000.00");
    assertThat(alert.type()).isEqualTo(TransactionType.CREDIT);
    assertThat(alert.description()).isEqualTo("MAARCUS RENI");
    assertThat(alert.accountSuffix()).isEqualTo("7829");
    assertThat(alert.transactionDate()).isEqualTo(Instant.parse("2026-09-29T18:30:00Z")); // 30 Sep midnight IST
  }

  @Test
  void canaraUpiDebitNowCarriesTheAccountSuffixToo() {
    ParsedAlert alert =
        canara.parse(
            "m7",
            "canarabank@canarabank.com",
            "UPI",
            "An amount of INR 250.00 has been DEBITED on 01/10/26 from your account XXXX7829 to SWIGGY with UPI Ref No.:1",
            NOW);

    assertThat(alert.type()).isEqualTo(TransactionType.DEBIT);
    assertThat(alert.accountSuffix()).isEqualTo("7829");
    assertThat(alert.description()).isEqualTo("SWIGGY");
  }

  @Test
  void aCanaraLoanCreditIsARepaymentOutOfTheAccountWithTheDayItArrived() {
    ParsedAlert alert =
        canara.parse(
            "m8",
            "canarabank@canarabank.com",
            "Loan Account Credit Alert",
            "Dear Customer, Thanking you for banking with Canara Bank. Your Loan account no. XXXX4689 has been credited with amount Rs. INR 4,681.00. This is an auto generated mail",
            Instant.parse("2026-09-30T20:00:00Z")); // 1 Oct 01:30 IST

    assertThat(alert.amount()).isEqualByComparingTo("4681.00");
    assertThat(alert.type()).isEqualTo(TransactionType.DEBIT);
    assertThat(alert.accountSuffix()).isNull();
    assertThat(alert.description()).isEqualTo("Loan repayment (loan a/c 4689)");
    assertThat(alert.transactionDate()).isEqualTo(Instant.parse("2026-09-30T18:30:00Z")); // 1 Oct midnight IST
  }

  @Test
  void aCardPaymentReceivedIsMoneyInAgainstTheCardNotSpending() {
    ParsedAlert alert =
        card.parse(
            "m9",
            "HDFC Bank <alerts@hdfcbank.net>",
            "Pixel Credit Card Payment received!",
            "Dear Customer, We have received payment of INR 15000.00 on your Pixel Play credit card on 30/09/26 18:45. Sincerely, Pixel Play Credit Card",
            NOW);

    assertThat(alert.amount()).isEqualByComparingTo("15000.00");
    assertThat(alert.type()).isEqualTo(TransactionType.CREDIT);
    assertThat(alert.accountType().name()).isEqualTo("CREDIT_CARD");
    assertThat(alert.description()).isEqualTo("Card payment received");
  }

  @Test
  void hdfcSavingsAlertsCarryTheAccountSuffix() {
    ParsedAlert alert =
        salary.parse(
            "m10",
            "alerts@hdfcbank.bank.in",
            "UPI",
            "Rs.40.00 is debited from your account ending 2277 towards VPA gpay-1@okbizaxis (Merchant) on 30-09-26",
            NOW);

    assertThat(alert.accountSuffix()).isEqualTo("2277");
  }

  @Test
  void suffixHelperTakesTheLastDigitsAndToleratesNoise() {
    assertThat(AlertFormat.suffix("XXXX7829")).isEqualTo("7829");
    assertThat(AlertFormat.suffix("ending 2277")).isEqualTo("2277");
    assertThat(AlertFormat.suffix("50100123456789")).isEqualTo("6789");
    assertThat(AlertFormat.suffix("XXXX")).isNull();
    assertThat(AlertFormat.suffix(null)).isNull();
  }

  @Test
  void irregularSpacingAndHtmlInTheRealEmailDoNotBreakParsing() {
    GmailAlertParsingService service = new GmailAlertParsingService(java.util.List.of(canara, card, salary));

    ParsedAlert alert =
        service.parse(
            "m11",
            "canarabank@canarabank.com",
            "UPI/IMPS/MB Transaction Alert",
            "An amount of INR 40,000.00 has been CREDITED on 30/09/26 to your account  XXXX7829\r\nfrom MAARCUS RENI with UPI Ref No.:663937859272.",
            NOW);

    assertThat(alert.amount()).isEqualByComparingTo("40000.00");
    assertThat(alert.description()).isEqualTo("MAARCUS RENI");
    assertThat(alert.accountSuffix()).isEqualTo("7829");

    ParsedAlert html =
        service.parse(
            "m12", "HDFC Bank <alerts@hdfcbank.net>", "Payment", "<p>We have received payment of INR&nbsp;15000.00 on your <b>Pixel Play</b> credit card on 30/09/26 18:45</p>", NOW);
    assertThat(html.amount()).isEqualByComparingTo("15000.00");
  }

  @Test
  void plainTextCollapsesTagsEntitiesAndWhitespace() {
    assertThat(AlertFormat.plainText("<div>Rs.&nbsp;1,000 \u00a0 debited</div>\r\n<style>x{}</style>from A/c")).isEqualTo("Rs. 1,000 debited from A/c");
    assertThat(AlertFormat.plainText(null)).isEmpty();
  }

  @Test
  void hdfcSuccessfullyCreditedMailWithSenderBlockIsRead() {
    GmailAlertParsingService service = new GmailAlertParsingService(java.util.List.of(canara, card, salary));

    ParsedAlert alert =
        service.parse(
            "m20",
            "alerts@hdfcbank.bank.in",
            "View: Account update for your HDFC Bank A/c",
            "<style>@media screen { table { width: 100%; } }</style><p>Dear Customer, Greetings from HDFC Bank! We're writing to inform you that Rs.9000.00 has been successfully credited to your HDFC Bank account ending in 2277.</p>"
                + "<p>Transaction Details: a. Date: 06-07-26 b. Sender: MAARCUS RENIERO LAZA (VPA: maarcusreniero@okaxis) c. UPI Reference No.: 618745865696 Need Help? India</p>",
            NOW);

    assertThat(alert.type().name()).isEqualTo("CREDIT");
    assertThat(alert.amount()).isEqualByComparingTo("9000.00");
    assertThat(alert.accountSuffix()).isEqualTo("2277");
    assertThat(alert.description()).isEqualTo("MAARCUS RENIERO LAZA (maarcusreniero@okaxis)");
  }

  @Test
  void hdfcDebitCardAtmWithdrawalIsADebitWithoutTheCardDigits() {
    ParsedAlert alert =
        salary.parse(
            "m21",
            "alerts@hdfcbank.bank.in",
            "View: Account update for your HDFC Bank A/c",
            "Dear Card Holder, Thank you for using your HDFC Bank Debit Card ending 5480 for ATM withdrawal for Rs 19600.00 in CHENGALPATTU at SEMBAKKAM BRANCH on 06-07-2026 10:18:17. After the above transaction, the total available balance on your card is Rs 3883.47.",
            NOW);

    assertThat(alert.type().name()).isEqualTo("DEBIT");
    assertThat(alert.amount()).isEqualByComparingTo("19600.00");
    assertThat(alert.accountSuffix()).isNull();
    assertThat(alert.description()).isEqualTo("ATM withdrawal - CHENGALPATTU at SEMBAKKAM BRANCH");
  }
}
