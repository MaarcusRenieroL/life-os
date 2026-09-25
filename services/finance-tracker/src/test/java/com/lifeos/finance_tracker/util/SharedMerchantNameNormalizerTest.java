package com.lifeos.finance_tracker.util;

import static org.assertj.core.api.Assertions.assertThat;

import com.lifeos.common.finance.MerchantNameNormalizer;
import org.junit.jupiter.api.Test;

/**
 * finance-tracker and batches each carried their own copy of this normalizer with genuinely
 * different algorithms. Both write into finance_schema.merchants, so the same real merchant
 * normalized to two different names depending on which ingest path a transaction arrived through -
 * splitting one merchant (and its spend totals) across two rows. Both copies are gone; both
 * services now use com.lifeos.common.finance.MerchantNameNormalizer.
 *
 * <p>These cases are specifically the behavior finance-tracker's old local copy did NOT have - it
 * had no brand list and no bank-narration parsing at all, so it was the copy producing the wrong
 * merchant names.
 */
class SharedMerchantNameNormalizerTest {

  /**
   * The corruption this swap fixes: UPI payee names are truncated to a fixed-length VPA-derived
   * field, so the same merchant arrives as several different strings. finance-tracker's old copy
   * title-cased them as-is ("Swiggyli", "Swiggyin"); batches' collapsed them onto the brand. Each
   * distinct output was a separate merchant row.
   */
  @Test
  void collapsesTruncatedUpiBrandVariantsOntoOneCanonicalMerchant() {
    assertThat(MerchantNameNormalizer.normalize("SWIGGY")).isEqualTo("Swiggy");
    assertThat(MerchantNameNormalizer.normalize("SWIGGYLI")).isEqualTo("Swiggy");
    assertThat(MerchantNameNormalizer.normalize("SWIGGYIN")).isEqualTo("Swiggy");
    assertThat(MerchantNameNormalizer.normalize("SWIGGY INSTAMART")).isEqualTo("Swiggy");
  }

  @Test
  void recognizesBrandsRegardlessOfSpacingAndCase() {
    assertThat(MerchantNameNormalizer.normalize("zomato")).isEqualTo("Zomato");
    assertThat(MerchantNameNormalizer.normalize("AMAZON PAY INDIA")).isEqualTo("Amazon");
    assertThat(MerchantNameNormalizer.normalize("Flip Kart")).isEqualTo("Flipkart");
  }

  @Test
  void extractsThePayeeFromSlashDelimitedUpiNarration() {
    assertThat(
            MerchantNameNormalizer.normalize(
                "UPI/DR/618062840396/M S JOLEN/ICIC/**39337@ICICI/UPI//AXI31E2EAD962E54AF0BCB60C2F0A910013/29/06/2026 20:07:34"))
        .isEqualTo("M S Jolen");
  }

  @Test
  void extractsThePayeeFromHdfcStyleDashNarration() {
    assertThat(MerchantNameNormalizer.normalize("UPI-ZEPTO MARKETPLACE")).isEqualTo("Zepto");
    assertThat(MerchantNameNormalizer.normalize("UPI-AUTOPAY-NETFLIX")).isEqualTo("Netflix");
  }

  @Test
  void labelsAtmWithdrawalsInsteadOfSurfacingTerminalCodes() {
    assertThat(MerchantNameNormalizer.normalize("ATW-417xxxxxxxxx1234-CANARA BANK-CHENNAI"))
        .isEqualTo("ATM Withdrawal");
  }

  @Test
  void stripsChainedLegalEntitySuffixes() {
    assertThat(MerchantNameNormalizer.normalize("Loyola Co")).isEqualTo("Loyola");
    assertThat(MerchantNameNormalizer.normalize("Acme Technologies Pvt Ltd")).isEqualTo("Acme");
  }

  @Test
  void dropsReferenceNumberAndDateTimeNoise() {
    assertThat(MerchantNameNormalizer.normalize("NEFT 000123456789 Loyola College 29/06/2026 20:07:34"))
        .isEqualTo("Loyola College");
  }

  @Test
  void fallsBackToAPlaceholderRatherThanReturningBlank() {
    assertThat(MerchantNameNormalizer.normalize(null)).isEqualTo("Unknown transaction");
    assertThat(MerchantNameNormalizer.normalize("   ")).isEqualTo("Unknown transaction");
  }
}
