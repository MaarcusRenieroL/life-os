package com.lifeos.workouts.service;

import com.lifeos.workouts.domains.dto.request.SaveExerciseRequest;
import com.lifeos.workouts.domains.dto.response.ExerciseResponse;
import com.lifeos.workouts.domains.entity.Exercise;
import com.lifeos.workouts.domains.enums.Equipment;
import com.lifeos.workouts.domains.enums.ExerciseCategory;
import com.lifeos.workouts.exception.InvalidRequestException;
import com.lifeos.workouts.exception.ResourceNotFoundException;
import com.lifeos.workouts.repository.ExerciseRepository;
import com.lifeos.workouts.repository.RoutineExerciseRepository;
import com.lifeos.workouts.repository.SessionSetRepository;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The exercise library: the seeded built-ins every user sees plus each user's own custom
 * exercises. Built-ins are read-only. */
@Service
@RequiredArgsConstructor
@Transactional
public class ExerciseService {

  private final ExerciseRepository exerciseRepository;
  private final RoutineExerciseRepository routineExerciseRepository;
  private final SessionSetRepository sessionSetRepository;

  @Transactional(readOnly = true)
  public List<ExerciseResponse> list(UUID userId, String q, ExerciseCategory category, Equipment equipment) {
    String needle = q == null || q.isBlank() ? null : q.trim().toLowerCase();
    return exerciseRepository.findAllByUserIdIsNullOrUserId(userId).stream()
        .filter(e -> category == null || e.getCategory() == category)
        .filter(e -> equipment == null || e.getEquipment() == equipment)
        .filter(e -> needle == null || e.getName().toLowerCase().contains(needle))
        .sorted(Comparator.comparing(Exercise::getName, String.CASE_INSENSITIVE_ORDER))
        .map(e -> toResponse(e))
        .toList();
  }

  public ExerciseResponse create(UUID userId, SaveExerciseRequest request) {
    String name = request.name().trim();
    if (exerciseRepository.existsByUserIdAndNameIgnoreCase(userId, name)
        || exerciseRepository.existsByUserIdIsNullAndNameIgnoreCase(name)) {
      throw new InvalidRequestException("An exercise called \"" + name + "\" already exists");
    }
    Exercise exercise =
        Exercise.builder()
            .userId(userId)
            .name(name)
            .category(request.category())
            .equipment(request.equipment())
            .instructions(request.instructions() == null || request.instructions().isBlank() ? null : request.instructions().trim())
            .build();
    return toResponse(exerciseRepository.save(exercise));
  }

  /** Only the caller's own custom exercises can be removed, and only while nothing references
   * them - deleting one out from under a routine or logged history would corrupt both. */
  public void delete(UUID userId, UUID id) {
    Exercise exercise =
        exerciseRepository.findByIdAndUserId(id, userId).orElseThrow(() -> ResourceNotFoundException.of("Exercise", id));
    if (routineExerciseRepository.existsByExerciseId(id) || sessionSetRepository.existsByExerciseId(id)) {
      throw new InvalidRequestException("This exercise is used in a routine or workout history and can't be deleted");
    }
    exerciseRepository.delete(exercise);
  }

  /** Resolves an exercise the caller can use (built-in or their own), or 404s. */
  public Exercise requireVisible(UUID userId, UUID id) {
    return exerciseRepository.findVisible(id, userId).orElseThrow(() -> ResourceNotFoundException.of("Exercise", id));
  }

  static ExerciseResponse toResponse(Exercise e) {
    return new ExerciseResponse(e.getId(), e.getName(), e.getCategory(), e.getEquipment(), e.getInstructions(), e.getUserId() != null);
  }
}
