package com.lifeos.workouts.service;

import com.lifeos.workouts.domains.entity.BodyMeasurement;
import com.lifeos.workouts.domains.entity.SessionSet;
import com.lifeos.workouts.domains.entity.WorkoutSession;
import com.lifeos.workouts.domains.enums.SessionStatus;
import com.lifeos.workouts.repository.BodyMeasurementRepository;
import com.lifeos.workouts.repository.SessionSetRepository;
import com.lifeos.workouts.repository.WorkoutSessionRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Per-day workout numbers and the weigh-in series, for core's analytics. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkoutStatsService {

  public record Day(LocalDate date, int sessions, BigDecimal volume, int minutes) {}

  public record Weight(LocalDate date, BigDecimal weightKg) {}

  public record WorkoutStats(List<Day> days, List<Weight> weights) {}

  private final WorkoutSessionRepository sessionRepository;
  private final SessionSetRepository setRepository;
  private final BodyMeasurementRepository measurementRepository;

  public WorkoutStats stats(UUID userId, LocalDate from, LocalDate to, ZoneId zone) {
    List<WorkoutSession> sessions =
        sessionRepository
            .findAllByUserIdAndStatusAndCompletedAtGreaterThanEqual(userId, SessionStatus.COMPLETED, from.atStartOfDay(zone).toInstant())
            .stream()
            .filter(s -> !s.getCompletedAt().atZone(zone).toLocalDate().isAfter(to))
            .toList();
    Map<UUID, List<SessionSet>> sets =
        sessions.isEmpty()
            ? Map.of()
            : setRepository.findAllBySessionIdIn(sessions.stream().map(WorkoutSession::getId).toList()).stream().collect(Collectors.groupingBy(SessionSet::getSessionId));

    Map<LocalDate, Object[]> byDay = new TreeMap<>();
    for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) byDay.put(d, new Object[] {0, BigDecimal.ZERO, 0});
    for (WorkoutSession s : sessions) {
      Object[] slot = byDay.get(s.getCompletedAt().atZone(zone).toLocalDate());
      slot[0] = (int) slot[0] + 1;
      slot[2] = (int) slot[2] + (s.getDurationSeconds() == null ? 0 : s.getDurationSeconds() / 60);
      BigDecimal volume = (BigDecimal) slot[1];
      for (SessionSet set : sets.getOrDefault(s.getId(), List.of())) {
        if (Boolean.TRUE.equals(set.getCompleted()) && set.getActualWeight() != null && set.getActualReps() != null) {
          volume = volume.add(set.getActualWeight().multiply(BigDecimal.valueOf(set.getActualReps())));
        }
      }
      slot[1] = volume;
    }

    List<Day> days = new ArrayList<>();
    byDay.forEach((date, v) -> days.add(new Day(date, (int) v[0], (BigDecimal) v[1], (int) v[2])));

    List<Weight> weights =
        measurementRepository.findAllByUserIdAndMeasuredOnBetweenOrderByMeasuredOnAscCreatedAtAsc(userId, from, to).stream()
            .filter(m -> m.getWeightKg() != null)
            .map((BodyMeasurement m) -> new Weight(m.getMeasuredOn(), m.getWeightKg()))
            .toList();
    return new WorkoutStats(days, weights);
  }
}
