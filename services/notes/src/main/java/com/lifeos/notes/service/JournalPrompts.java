package com.lifeos.notes.service;

import com.lifeos.notes.domains.dto.response.JournalPromptResponse;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/** The built-in prompt library for structured journaling. Fixed rather than user-managed - the
 * point is a good starting set; anything else goes in free writing. */
public final class JournalPrompts {

  private JournalPrompts() {}

  public static final List<JournalPromptResponse> ALL =
      List.of(
          new JournalPromptResponse("grateful", "Gratitude", "What are three things I'm grateful for today?"),
          new JournalPromptResponse("small-win", "Gratitude", "What small win am I proud of?"),
          new JournalPromptResponse("someone", "Gratitude", "Who made my day better, and how?"),
          new JournalPromptResponse("went-well", "Reflection", "What went well today?"),
          new JournalPromptResponse("went-badly", "Reflection", "What didn't go as planned, and what can I learn from it?"),
          new JournalPromptResponse("energy", "Reflection", "What gave me energy today, and what drained it?"),
          new JournalPromptResponse("surprised", "Reflection", "What surprised me today?"),
          new JournalPromptResponse("feeling", "Emotions", "How am I really feeling right now, and why?"),
          new JournalPromptResponse("stress", "Emotions", "What's weighing on me, and what's one thing I can do about it?"),
          new JournalPromptResponse("body", "Emotions", "How does my body feel? What does it need?"),
          new JournalPromptResponse("tomorrow", "Planning", "What are the top three things for tomorrow?"),
          new JournalPromptResponse("priority", "Planning", "What's the one thing that would make tomorrow a success?"),
          new JournalPromptResponse("goal-step", "Goals", "What did I do today that moved a goal forward?"),
          new JournalPromptResponse("goal-block", "Goals", "What's getting in the way of my most important goal?"),
          new JournalPromptResponse("future-self", "Goals", "What would my future self thank me for doing this week?"),
          new JournalPromptResponse("learned", "Learning", "What did I learn today?"));

  /** Three prompts for the day, deterministic per date (so the suggestion doesn't reshuffle on a
   * refresh) and walking the whole library over time, one from a different category each. */
  public static List<JournalPromptResponse> suggestedFor(LocalDate date) {
    int start = Math.floorMod(date.toEpochDay() * 7, ALL.size());
    List<JournalPromptResponse> picks = new ArrayList<>();
    for (int offset = 0; offset < ALL.size() && picks.size() < 3; offset++) {
      JournalPromptResponse candidate = ALL.get((start + offset * 5) % ALL.size());
      boolean sameCategoryTaken = picks.stream().anyMatch(p -> p.category().equals(candidate.category()));
      if (!sameCategoryTaken && picks.stream().noneMatch(p -> p.id().equals(candidate.id()))) picks.add(candidate);
    }
    return picks;
  }
}
