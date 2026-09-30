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
            "An amount of INR 1,250.00 has been CREDITED on 12/09/26 from your account XX1234 to Ravi K with UPI Ref No.:123456",
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
}
