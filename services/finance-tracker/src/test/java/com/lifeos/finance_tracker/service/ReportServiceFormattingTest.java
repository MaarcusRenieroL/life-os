package com.lifeos.finance_tracker.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class ReportServiceFormattingTest {

  @Test
  void csvFieldsThatWouldRunAsSpreadsheetFormulasAreNeutralised() {
    assertThat(ReportService.escapeCsv("=HYPERLINK(\"http://evil\",\"x\")")).isEqualTo("\"'=HYPERLINK(\"\"http://evil\"\",\"\"x\"\")\"");
    assertThat(ReportService.escapeCsv("+91 98765")).isEqualTo("'+91 98765");
    assertThat(ReportService.escapeCsv("-cmd|' /C calc'!A0")).startsWith("'-");
    assertThat(ReportService.escapeCsv("@SUM(A1)")).isEqualTo("'@SUM(A1)");
  }

  @Test
  void ordinaryAndMultilineFieldsAreQuotedCorrectly() {
    assertThat(ReportService.escapeCsv("Swiggy")).isEqualTo("Swiggy");
    assertThat(ReportService.escapeCsv("Tom, Jerry")).isEqualTo("\"Tom, Jerry\"");
    assertThat(ReportService.escapeCsv("line one\nline two")).isEqualTo("\"line one\nline two\"");
    assertThat(ReportService.escapeCsv(null)).isEmpty();
    assertThat(ReportService.escapeCsv("")).isEmpty();
  }

  @Test
  void narrationsAreEscapedBeforeTheyReachThePdfHtml() {
    assertThat(ReportService.html("AT&T <b>x</b>")).isEqualTo("AT&amp;T &lt;b&gt;x&lt;/b&gt;");
    assertThat(ReportService.html(null)).isEmpty();
  }

  @Test
  void rupeesUseIndianGroupingAndNeverADollarSign() {
    assertThat(ReportService.money(new BigDecimal("1234567.5"))).isEqualTo("Rs 12,34,567.50");
    assertThat(ReportService.money(new BigDecimal("-499"))).isEqualTo("-Rs 499.00");
    assertThat(ReportService.money(BigDecimal.ZERO)).isEqualTo("Rs 0.00");
  }
}
