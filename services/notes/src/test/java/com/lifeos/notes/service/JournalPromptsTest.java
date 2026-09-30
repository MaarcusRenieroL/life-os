package com.lifeos.notes.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.lifeos.notes.domains.dto.response.JournalPromptResponse;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

class JournalPromptsTest {

  @Test
  void theLibraryHasUniqueIds() {
    Set<String> ids = new HashSet<>();
    JournalPrompts.ALL.forEach(p -> assertThat(ids.add(p.id())).as(p.id()).isTrue());
    assertThat(JournalPrompts.ALL).hasSizeGreaterThanOrEqualTo(12);
  }

  @Test
  void suggestsThreeDistinctPromptsFromDifferentCategories() {
    for (int day = 0; day < 60; day++) {
      List<JournalPromptResponse> picks = JournalPrompts.suggestedFor(LocalDate.of(2026, 1, 1).plusDays(day));

      assertThat(picks).hasSize(3);
      assertThat(picks.stream().map(JournalPromptResponse::id).distinct()).hasSize(3);
      assertThat(picks.stream().map(JournalPromptResponse::category).distinct()).hasSize(3);
    }
  }

  @Test
  void theSuggestionIsStableForADateAndVariesAcrossDates() {
    LocalDate day = LocalDate.of(2026, 9, 30);

    assertThat(JournalPrompts.suggestedFor(day)).isEqualTo(JournalPrompts.suggestedFor(day));
    Set<List<JournalPromptResponse>> distinct = new HashSet<>();
    for (int i = 0; i < 14; i++) distinct.add(JournalPrompts.suggestedFor(day.plusDays(i)));
    assertThat(distinct.size()).isGreaterThan(3);
  }
}
