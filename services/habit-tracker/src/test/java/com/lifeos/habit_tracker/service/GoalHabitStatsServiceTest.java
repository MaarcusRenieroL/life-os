package com.lifeos.habit_tracker.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.lifeos.habit_tracker.domains.dto.response.ConsistencyResponse;
import com.lifeos.habit_tracker.domains.entity.Habit;
import com.lifeos.habit_tracker.domains.enums.HabitStatus;
import com.lifeos.habit_tracker.repository.HabitRepository;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class GoalHabitStatsServiceTest {

  @Mock private HabitRepository habitRepository;
  @Mock private ConsistencyService consistencyService;
  @InjectMocks private GoalHabitStatsService service;

  private final UUID userId = UUID.randomUUID();

  private ConsistencyResponse consistency(int completions, int scheduled) {
    return ConsistencyResponse.builder().completions(completions).scheduledOccurrences(scheduled).build();
  }

  @Test
  void sumsThisAndLastMonthAcrossEveryHabitOnAGoalAndIgnoresUnlinkedHabits() {
    UUID goalId = UUID.randomUUID();
    Habit linkedA = Habit.builder().id(UUID.randomUUID()).userId(userId).goalId(goalId).status(HabitStatus.ACTIVE).build();
    Habit linkedB = Habit.builder().id(UUID.randomUUID()).userId(userId).goalId(goalId).status(HabitStatus.ACTIVE).build();
    Habit unlinked = Habit.builder().id(UUID.randomUUID()).userId(userId).status(HabitStatus.ACTIVE).build();
    when(habitRepository.findAllByUserIdAndStatus(userId, HabitStatus.ACTIVE)).thenReturn(List.of(linkedA, linkedB, unlinked));
    when(consistencyService.calculate(eq(linkedA), eq("month"), any())).thenReturn(consistency(5, 10), consistency(8, 10));
    when(consistencyService.calculate(eq(linkedB), eq("month"), any())).thenReturn(consistency(2, 4), consistency(3, 4));

    var stats = service.statsByGoal(userId);

    assertThat(stats).containsOnlyKeys(goalId);
    assertThat(stats.get(goalId).getActiveHabits()).isEqualTo(2);
    assertThat(stats.get(goalId).getCompletions()).isEqualTo(18);
    assertThat(stats.get(goalId).getScheduledOccurrences()).isEqualTo(28);
  }

  @Test
  void noLinkedHabitsMeansAnEmptyMap() {
    when(habitRepository.findAllByUserIdAndStatus(userId, HabitStatus.ACTIVE)).thenReturn(List.of());

    assertThat(service.statsByGoal(userId)).isEmpty();
  }
}
