package com.lifeos.finance_tracker.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

class OwnNameServiceTest {

  private final List<String> names = List.of("Maarcus Reniero L", "M R LAWRENCE");

  @Test
  void aNarrationCarryingTheHoldersNameIsASelfTransfer() {
    assertThat(OwnNameService.matches(names, "UPI-MAARCUS RENIERO L-maarcus@okhdfc-HDFC0001-1234")).isTrue();
    assertThat(OwnNameService.matches(names, "NEFT/Maarcus  Reniero  L/Savings")).isTrue();
    assertThat(OwnNameService.matches(names, "IMPS-m r lawrence-self")).isTrue();
  }

  @Test
  void otherPeopleAndPartialWordsAreNotMatched() {
    assertThat(OwnNameService.matches(names, "UPI-MAARCUSON TRADERS-pay")).isFalse();
    assertThat(OwnNameService.matches(names, "UPI-RAHUL SHARMA-dinner")).isFalse();
    assertThat(OwnNameService.matches(List.of(), "UPI-MAARCUS RENIERO L")).isFalse();
    assertThat(OwnNameService.matches(names, null)).isFalse();
  }
}
