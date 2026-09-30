package com.lifeos.workouts.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.lifeos.workouts.domains.dto.request.RoutineExerciseInput;
import com.lifeos.workouts.domains.dto.request.SaveRoutineRequest;
import com.lifeos.workouts.domains.dto.response.RoutineResponse;
import com.lifeos.workouts.domains.entity.Exercise;
import com.lifeos.workouts.domains.entity.Routine;
import com.lifeos.workouts.domains.entity.RoutineExercise;
import com.lifeos.workouts.domains.enums.ExerciseCategory;
import com.lifeos.workouts.exception.InvalidRequestException;
import com.lifeos.workouts.exception.ResourceNotFoundException;
import com.lifeos.workouts.repository.ExerciseRepository;
import com.lifeos.workouts.repository.RoutineExerciseRepository;
import com.lifeos.workouts.repository.RoutineRepository;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class RoutineServiceTest {

  @Mock private RoutineRepository routineRepository;
  @Mock private RoutineExerciseRepository routineExerciseRepository;
  @Mock private ExerciseRepository exerciseRepository;
  @Mock private ExerciseService exerciseService;

  private RoutineService service;

  private final UUID userId = UUID.randomUUID();
  private final Exercise bench = Exercise.builder().id(UUID.randomUUID()).name("Bench").category(ExerciseCategory.CHEST).build();
  private final Exercise row = Exercise.builder().id(UUID.randomUUID()).name("Row").category(ExerciseCategory.BACK).build();
  private final List<RoutineExercise> stored = new ArrayList<>();

  @BeforeEach
  void setUp() {
    service = new RoutineService(routineRepository, routineExerciseRepository, exerciseRepository, exerciseService);
    when(routineRepository.save(any())).thenAnswer(inv -> {
      Routine r = inv.getArgument(0);
      if (r.getId() == null) r.setId(UUID.randomUUID());
      return r;
    });
    when(routineExerciseRepository.saveAll(anyCollection())).thenAnswer(inv -> {
      stored.addAll((java.util.Collection<RoutineExercise>) inv.getArgument(0));
      return inv.getArgument(0);
    });
    when(routineExerciseRepository.save(any())).thenAnswer(inv -> {
      stored.add(inv.getArgument(0));
      return inv.getArgument(0);
    });
    when(routineExerciseRepository.findAllByRoutineIdIn(anyCollection())).thenAnswer(inv -> stored);
    when(exerciseRepository.findAllByIdIn(anyCollection())).thenReturn(List.of(bench, row));
  }

  private RoutineExerciseInput input(Exercise e, Integer sets, Integer reps, String weight) {
    return new RoutineExerciseInput(e.getId(), sets, reps, weight == null ? null : new BigDecimal(weight), null);
  }

  @Test
  void createStoresExercisesInTheOrderSentWithDefaultsForBlanks() {
    RoutineResponse response =
        service.create(userId, new SaveRoutineRequest(" Push ", "  ", List.of(input(bench, 4, 8, "60"), input(row, null, null, null))));

    assertThat(response.name()).isEqualTo("Push");
    assertThat(response.description()).isNull();
    assertThat(response.template()).isFalse();
    assertThat(response.exercises()).extracting(e -> e.exerciseName()).containsExactly("Bench", "Row");
    assertThat(response.exercises().get(0).targetSets()).isEqualTo(4);
    assertThat(response.exercises().get(0).targetWeight()).isEqualByComparingTo("60");
    assertThat(response.exercises().get(1).targetSets()).isEqualTo(3);
    assertThat(response.exercises().get(1).targetReps()).isEqualTo(10);
    assertThat(response.exercises().get(1).restSeconds()).isEqualTo(90);
  }

  @Test
  void aRoutineCannotListTheSameExerciseTwice() {
    assertThatThrownBy(() -> service.create(userId, new SaveRoutineRequest("A", null, List.of(input(bench, 3, 8, null), input(bench, 3, 8, null)))))
        .isInstanceOf(InvalidRequestException.class);
  }

  @Test
  void anUnusableExerciseIsRejectedBeforeTheStoredListIsTouched() {
    Routine existing = Routine.builder().id(UUID.randomUUID()).userId(userId).name("Old").build();
    when(routineRepository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
    when(exerciseService.requireVisible(userId, bench.getId())).thenThrow(ResourceNotFoundException.of("Exercise", bench.getId()));

    assertThatThrownBy(() -> service.update(userId, existing.getId(), new SaveRoutineRequest("New", null, List.of(input(bench, 3, 8, null)))))
        .isInstanceOf(ResourceNotFoundException.class);

    verify(routineExerciseRepository, never()).deleteAllByRoutineId(any());
  }

  @Test
  void updateReplacesTheWholeExerciseList() {
    Routine existing = Routine.builder().id(UUID.randomUUID()).userId(userId).name("Old").build();
    when(routineRepository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

    service.update(userId, existing.getId(), new SaveRoutineRequest("New", null, List.of(input(row, 5, 5, null))));

    verify(routineExerciseRepository).deleteAllByRoutineId(existing.getId());
    assertThat(existing.getName()).isEqualTo("New");
    assertThat(stored).hasSize(1);
    assertThat(stored.get(0).getPosition()).isEqualTo(1);
  }

  @Test
  void copyingATemplateMakesAnOwnedCopyWithTheSameExercises() {
    Routine template = Routine.builder().id(UUID.randomUUID()).name("Push").description("d").templateGroup("PPL").build();
    when(routineRepository.findByIdAndUserIdIsNull(template.getId())).thenReturn(Optional.of(template));
    when(routineExerciseRepository.findAllByRoutineIdOrderByPositionAsc(template.getId()))
        .thenReturn(List.of(RoutineExercise.builder().exerciseId(bench.getId()).position(1).targetSets(4).targetReps(8).restSeconds(120).build()));

    RoutineResponse copy = service.copyTemplate(userId, template.getId());

    assertThat(copy.id()).isNotEqualTo(template.getId());
    assertThat(copy.template()).isFalse();
    assertThat(copy.templateGroup()).isNull();
    assertThat(copy.exercises()).hasSize(1);
    assertThat(copy.exercises().get(0).targetSets()).isEqualTo(4);
  }

  @Test
  void aNonTemplateCannotBeCopiedAsOne() {
    UUID id = UUID.randomUUID();
    when(routineRepository.findByIdAndUserIdIsNull(id)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.copyTemplate(userId, id)).isInstanceOf(ResourceNotFoundException.class);
  }

  @Test
  void anotherUsersRoutineIsNotFound() {
    UUID id = UUID.randomUUID();
    when(routineRepository.findByIdAndUserId(id, userId)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.get(userId, id)).isInstanceOf(ResourceNotFoundException.class);
    assertThatThrownBy(() -> service.delete(userId, id)).isInstanceOf(ResourceNotFoundException.class);
  }
}
