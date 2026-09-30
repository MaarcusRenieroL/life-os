package com.lifeos.workouts.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.lifeos.workouts.domains.dto.request.SaveExerciseRequest;
import com.lifeos.workouts.domains.dto.request.SaveMeasurementRequest;
import com.lifeos.workouts.domains.dto.response.ExerciseResponse;
import com.lifeos.workouts.domains.dto.response.MeasurementResponse;
import com.lifeos.workouts.domains.entity.Exercise;
import com.lifeos.workouts.domains.enums.Equipment;
import com.lifeos.workouts.domains.enums.ExerciseCategory;
import com.lifeos.workouts.exception.InvalidRequestException;
import com.lifeos.workouts.exception.ResourceNotFoundException;
import com.lifeos.workouts.repository.BodyMeasurementRepository;
import com.lifeos.workouts.repository.ExerciseRepository;
import com.lifeos.workouts.repository.RoutineExerciseRepository;
import com.lifeos.workouts.repository.SessionSetRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

class ExerciseAndMeasurementServiceTest {

  @Nested
  @ExtendWith(MockitoExtension.class)
  class Exercises {
    @Mock private ExerciseRepository exerciseRepository;
    @Mock private RoutineExerciseRepository routineExerciseRepository;
    @Mock private SessionSetRepository sessionSetRepository;
    @InjectMocks private ExerciseService service;

    private final UUID userId = UUID.randomUUID();

    private Exercise exercise(String name, ExerciseCategory category, Equipment equipment, UUID owner) {
      return Exercise.builder().id(UUID.randomUUID()).userId(owner).name(name).category(category).equipment(equipment).build();
    }

    @Test
    void listFiltersByCategoryEquipmentAndTextAndSortsByName() {
      when(exerciseRepository.findAllByUserIdIsNullOrUserId(userId))
          .thenReturn(List.of(
              exercise("Squat", ExerciseCategory.LEGS, Equipment.BARBELL, null),
              exercise("Bench Press", ExerciseCategory.CHEST, Equipment.BARBELL, null),
              exercise("Push-Up", ExerciseCategory.CHEST, Equipment.BODYWEIGHT, null),
              exercise("Cable Fly", ExerciseCategory.CHEST, Equipment.CABLE, userId)));

      assertThat(service.list(userId, null, null, null)).extracting(ExerciseResponse::name).containsExactly("Bench Press", "Cable Fly", "Push-Up", "Squat");
      assertThat(service.list(userId, null, ExerciseCategory.CHEST, Equipment.BARBELL)).extracting(ExerciseResponse::name).containsExactly("Bench Press");
      assertThat(service.list(userId, "PUSH", null, null)).extracting(ExerciseResponse::name).containsExactly("Push-Up");
      assertThat(service.list(userId, null, null, null).stream().filter(ExerciseResponse::custom)).extracting(ExerciseResponse::name).containsExactly("Cable Fly");
    }

    @Test
    void createRejectsANameThatMatchesABuiltInOrOneOfYours() {
      when(exerciseRepository.existsByUserIdAndNameIgnoreCase(userId, "Squat")).thenReturn(false);
      when(exerciseRepository.existsByUserIdIsNullAndNameIgnoreCase("Squat")).thenReturn(true);
      when(exerciseRepository.existsByUserIdAndNameIgnoreCase(userId, "Mine")).thenReturn(true);

      assertThatThrownBy(() -> service.create(userId, new SaveExerciseRequest("Squat", ExerciseCategory.LEGS, Equipment.BARBELL, null))).isInstanceOf(InvalidRequestException.class);
      assertThatThrownBy(() -> service.create(userId, new SaveExerciseRequest("Mine", ExerciseCategory.LEGS, Equipment.BARBELL, null))).isInstanceOf(InvalidRequestException.class);
      verify(exerciseRepository, never()).save(any());
    }

    @Test
    void createStoresACustomExerciseOwnedByTheCaller() {
      when(exerciseRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

      ExerciseResponse response = service.create(userId, new SaveExerciseRequest("  Sled Push ", ExerciseCategory.FULL_BODY, Equipment.OTHER, " "));

      assertThat(response.name()).isEqualTo("Sled Push");
      assertThat(response.custom()).isTrue();
      assertThat(response.instructions()).isNull();
    }

    @Test
    void builtInsCannotBeDeleted() {
      UUID id = UUID.randomUUID();
      when(exerciseRepository.findByIdAndUserId(id, userId)).thenReturn(Optional.empty());

      assertThatThrownBy(() -> service.delete(userId, id)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void anExerciseInUseCannotBeDeleted() {
      Exercise custom = exercise("Sled Push", ExerciseCategory.FULL_BODY, Equipment.OTHER, userId);
      when(exerciseRepository.findByIdAndUserId(custom.getId(), userId)).thenReturn(Optional.of(custom));
      when(sessionSetRepository.existsByExerciseId(custom.getId())).thenReturn(true);

      assertThatThrownBy(() -> service.delete(userId, custom.getId())).isInstanceOf(InvalidRequestException.class);
      verify(exerciseRepository, never()).delete(any());
    }

    @Test
    void anUnusedCustomExerciseCanBeDeleted() {
      Exercise custom = exercise("Sled Push", ExerciseCategory.FULL_BODY, Equipment.OTHER, userId);
      when(exerciseRepository.findByIdAndUserId(custom.getId(), userId)).thenReturn(Optional.of(custom));

      service.delete(userId, custom.getId());

      verify(exerciseRepository).delete(custom);
    }
  }

  @Nested
  @ExtendWith(MockitoExtension.class)
  class Measurements {
    @Mock private BodyMeasurementRepository measurementRepository;
    @InjectMocks private MeasurementService service;

    private final UUID userId = UUID.randomUUID();

    private SaveMeasurementRequest request(LocalDate on, String weight, String waist) {
      return new SaveMeasurementRequest(on, weight == null ? null : new BigDecimal(weight), null, waist == null ? null : new BigDecimal(waist), null, null, null, "  ");
    }

    @Test
    void anEmptyMeasurementIsRejected() {
      assertThatThrownBy(() -> service.create(userId, request(null, null, null))).isInstanceOf(InvalidRequestException.class);
    }

    @Test
    void aFutureDateIsRejected() {
      assertThatThrownBy(() -> service.create(userId, request(LocalDate.now().plusDays(1), "80", null))).isInstanceOf(InvalidRequestException.class);
    }

    @Test
    void aWeighInAloneIsEnoughAndDefaultsToToday() {
      when(measurementRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

      MeasurementResponse response = service.create(userId, request(null, "81.4", null));

      assertThat(response.measuredOn()).isEqualTo(LocalDate.now());
      assertThat(response.weightKg()).isEqualByComparingTo("81.4");
      assertThat(response.notes()).isNull();
    }

    @Test
    void anotherUsersMeasurementIsNotFound() {
      UUID id = UUID.randomUUID();
      when(measurementRepository.findByIdAndUserId(id, userId)).thenReturn(Optional.empty());

      assertThatThrownBy(() -> service.update(userId, id, request(null, "80", null))).isInstanceOf(ResourceNotFoundException.class);
      assertThatThrownBy(() -> service.delete(userId, id)).isInstanceOf(ResourceNotFoundException.class);
    }
  }
}
