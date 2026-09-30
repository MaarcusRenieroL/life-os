package com.lifeos.workouts.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.lifeos.workouts.domains.dto.response.WorkoutAnalyticsResponse;
import com.lifeos.workouts.domains.entity.SessionSet;
import com.lifeos.workouts.domains.entity.WorkoutSession;
import com.lifeos.workouts.domains.enums.SessionStatus;
import com.lifeos.workouts.exception.InvalidRequestException;
import com.lifeos.workouts.repository.PersonalRecordRepository;
import com.lifeos.workouts.repository.SessionSetRepository;
import com.lifeos.workouts.repository.WorkoutSessionRepository;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class WorkoutAnalyticsServiceTest {

  @Mock private WorkoutSessionRepository sessionRepository;
  @Mock private SessionSetRepository setRepository;
  @Mock private PersonalRecordRepository recordRepository;
  @InjectMocks private WorkoutAnalyticsService service;

  private final UUID userId = UUID.randomUUID();
  private final ZoneId zone = ZoneId.of("UTC");

  private Instant onWeek(int weeksAgo, int hour) {
    LocalDate monday = LocalDate.now(zone).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).minusWeeks(weeksAgo);
    return monday.atTime(hour, 0).atZone(zone).toInstant();
  }

  private WorkoutSession session(int weeksAgo, int minutes) {
    return WorkoutSession.builder().id(UUID.randomUUID()).userId(userId).status(SessionStatus.COMPLETED).completedAt(onWeek(weeksAgo, 12)).durationSeconds(minutes * 60).build();
  }

  @Test
  void bucketsSessionsIntoMondayWeeksAndSumsVolumeAndMinutes() {
    WorkoutSession a = session(0, 60);
    WorkoutSession b = session(0, 30);
    WorkoutSession c = session(2, 45);
    when(sessionRepository.findAllByUserIdAndStatusAndCompletedAtGreaterThanEqual(eq(userId), eq(SessionStatus.COMPLETED), any())).thenReturn(List.of(a, b, c));
    when(setRepository.findAllBySessionIdIn(anyCollection()))
        .thenReturn(List.of(
            SessionSet.builder().sessionId(a.getId()).completed(true).actualWeight(new BigDecimal("100")).actualReps(5).build(),
            SessionSet.builder().sessionId(a.getId()).completed(true).actualWeight(new BigDecimal("50")).actualReps(10).build(),
            // an unticked set never counts toward volume
            SessionSet.builder().sessionId(b.getId()).completed(false).actualWeight(new BigDecimal("999")).actualReps(9).build()));
    when(recordRepository.countByUserIdAndAchievedAtGreaterThanEqual(eq(userId), any())).thenReturn(3L);

    WorkoutAnalyticsResponse response = service.analytics(userId, 4, 2, zone);

    assertThat(response.weeks()).hasSize(4);
    var current = response.weeks().get(3);
    assertThat(current.sessions()).isEqualTo(2);
    assertThat(current.volume()).isEqualByComparingTo("1000");
    assertThat(current.minutes()).isEqualTo(90);
    assertThat(response.weeks().get(1).sessions()).isEqualTo(1);
    assertThat(response.weeks().get(2).sessions()).isZero();
    assertThat(response.totalSessions()).isEqualTo(3);
    assertThat(response.sessionsPerWeek()).isEqualTo(0.8);
    assertThat(response.averageDurationMinutes()).isEqualTo(45);
    assertThat(response.personalRecords()).isEqualTo(3);
    assertThat(response.currentWeekSessions()).isEqualTo(2);
  }

  @Test
  void streakUsesTheTargetAndLooksBeyondTheChartWindow() {
    List<WorkoutSession> sessions = new java.util.ArrayList<>();
    // 3 sessions a week for the last 6 weeks (incl. this one), though the chart only asks for 2.
    for (int week = 0; week < 6; week++) for (int i = 0; i < 3; i++) sessions.add(session(week, 30));
    when(sessionRepository.findAllByUserIdAndStatusAndCompletedAtGreaterThanEqual(eq(userId), eq(SessionStatus.COMPLETED), any())).thenReturn(sessions);
    when(setRepository.findAllBySessionIdIn(anyCollection())).thenReturn(List.of());

    WorkoutAnalyticsResponse response = service.analytics(userId, 2, 3, zone);

    assertThat(response.weeks()).hasSize(2);
    assertThat(response.currentStreakWeeks()).isEqualTo(6);
    assertThat(response.longestStreakWeeks()).isEqualTo(6);
    assertThat(service.analytics(userId, 2, 4, zone).currentStreakWeeks()).isZero();
  }

  @Test
  void noSessionsIsAllZeroesNotADivisionByZero() {
    when(sessionRepository.findAllByUserIdAndStatusAndCompletedAtGreaterThanEqual(eq(userId), eq(SessionStatus.COMPLETED), any())).thenReturn(List.of());

    WorkoutAnalyticsResponse response = service.analytics(userId, 12, 3, zone);

    assertThat(response.totalSessions()).isZero();
    assertThat(response.averageDurationMinutes()).isZero();
    assertThat(response.sessionsPerWeek()).isZero();
    assertThat(response.weeks()).hasSize(12);
  }

  @Test
  void rejectsAnOutOfRangeWindowOrTarget() {
    assertThatThrownBy(() -> service.analytics(userId, 0, 3, zone)).isInstanceOf(InvalidRequestException.class);
    assertThatThrownBy(() -> service.analytics(userId, 53, 3, zone)).isInstanceOf(InvalidRequestException.class);
    assertThatThrownBy(() -> service.analytics(userId, 12, 0, zone)).isInstanceOf(InvalidRequestException.class);
    assertThatThrownBy(() -> service.analytics(userId, 12, 15, zone)).isInstanceOf(InvalidRequestException.class);
  }
}
