package com.lifeos.batches.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class GmailSyncServiceTest {

  @Test
  void aRealTransactionAlertThatNoParserUnderstoodIsWorthReporting() {
    assertThat(GmailSyncService.looksLikeTransaction("Rs. 1,25,000.00 has been credited to your account ending 2277 by NEFT")).isTrue();
    assertThat(GmailSyncService.looksLikeTransaction("INR 499 spent on your card at Swiggy")).isTrue();
    assertThat(GmailSyncService.looksLikeTransaction("<p>₹ 2,500 debited from A/c XX1234</p>")).isTrue();
  }

  @Test
  void statementsOffersAndOtpsAreNotReported() {
    assertThat(GmailSyncService.looksLikeTransaction("Your e-statement for September is ready to download")).isFalse();
    assertThat(GmailSyncService.looksLikeTransaction("Pre-approved loan offer of Rs. 5,00,000 just for you")).isFalse();
    assertThat(GmailSyncService.looksLikeTransaction("Your OTP is 482913. Do not share it with anyone")).isFalse();
    assertThat(GmailSyncService.looksLikeTransaction(null)).isFalse();
  }
}
