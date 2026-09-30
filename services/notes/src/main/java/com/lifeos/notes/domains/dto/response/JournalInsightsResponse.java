package com.lifeos.notes.domains.dto.response;

import java.time.LocalDate;
import java.util.List;

/** Mood/energy over a date range plus journaling consistency. days runs oldest to newest and only
 * includes dates that have an entry; averages are over entries that recorded that number. */
public record JournalInsightsResponse(
    int totalEntries,
    Double averageMood,
    Double averageEnergy,
    int currentStreakDays,
    int longestStreakDays,
    List<DailyPoint> days) {

  public record DailyPoint(LocalDate date, Double mood, Double energy, int entries) {}
}
