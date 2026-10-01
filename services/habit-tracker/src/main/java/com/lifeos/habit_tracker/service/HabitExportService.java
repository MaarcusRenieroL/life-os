package com.lifeos.habit_tracker.service;

import com.lifeos.habit_tracker.domains.entity.Habit;
import com.lifeos.habit_tracker.domains.entity.HabitLog;
import com.lifeos.habit_tracker.repository.HabitLogRepository;
import com.lifeos.habit_tracker.repository.HabitRepository;
import java.io.IOException;
import java.io.Writer;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Streams the current user's habit logs as CSV directly to the HTTP response - a raw file
 * download, never wrapped in {@code ApiResponse}. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class HabitExportService {

  private static final int DEFAULT_RANGE_DAYS = 90;

  private final HabitLogRepository habitLogRepository;
  private final HabitRepository habitRepository;

  public void export(UUID userId, LocalDate from, LocalDate to, Writer writer) throws IOException {
    LocalDate effectiveTo = to != null ? to : LocalDate.now();
    LocalDate effectiveFrom = from != null ? from : effectiveTo.minusDays(DEFAULT_RANGE_DAYS);

    List<HabitLog> logs =
        habitLogRepository.findAllByUserIdAndLogDateBetween(userId, effectiveFrom, effectiveTo);
    Map<UUID, String> habitNamesById =
        habitRepository.findAllByUserId(userId).stream()
            .collect(Collectors.toMap(Habit::getId, Habit::getName, (a, b) -> a));

    writer.write("habit name,log_date,status,value,note\n");
    for (HabitLog log : logs) {
      String habitName = habitNamesById.getOrDefault(log.getHabitId(), "");
      writer.write(csvField(habitName));
      writer.write(',');
      writer.write(csvField(log.getLogDate().toString()));
      writer.write(',');
      writer.write(csvField(log.getStatus().name()));
      writer.write(',');
      writer.write(csvField(log.getValue() != null ? log.getValue().toString() : ""));
      writer.write(',');
      writer.write(csvField(log.getNote() != null ? log.getNote() : ""));
      writer.write('\n');
    }
    writer.flush();
  }

  private String csvField(String value) {
    if (value == null) {
      return "";
    }
    boolean needsQuoting = value.contains(",") || value.contains("\"") || value.contains("\n");
    String escaped = value.replace("\"", "\"\"");
    return needsQuoting ? "\"" + escaped + "\"" : escaped;
  }
}
