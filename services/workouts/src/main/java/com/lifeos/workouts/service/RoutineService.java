package com.lifeos.workouts.service;

import com.lifeos.workouts.domains.dto.request.RoutineExerciseInput;
import com.lifeos.workouts.domains.dto.request.SaveRoutineRequest;
import com.lifeos.workouts.domains.dto.response.RoutineExerciseResponse;
import com.lifeos.workouts.domains.dto.response.RoutineResponse;
import com.lifeos.workouts.domains.entity.Exercise;
import com.lifeos.workouts.domains.entity.Routine;
import com.lifeos.workouts.domains.entity.RoutineExercise;
import com.lifeos.workouts.exception.InvalidRequestException;
import com.lifeos.workouts.exception.ResourceNotFoundException;
import com.lifeos.workouts.repository.ExerciseRepository;
import com.lifeos.workouts.repository.RoutineExerciseRepository;
import com.lifeos.workouts.repository.RoutineRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class RoutineService {

  static final int DEFAULT_SETS = 3;
  static final int DEFAULT_REPS = 10;
  static final int DEFAULT_REST_SECONDS = 90;

  private final RoutineRepository routineRepository;
  private final RoutineExerciseRepository routineExerciseRepository;
  private final ExerciseRepository exerciseRepository;
  private final ExerciseService exerciseService;

  @Transactional(readOnly = true)
  public List<RoutineResponse> list(UUID userId) {
    return toResponses(routineRepository.findAllByUserIdOrderByNameAsc(userId));
  }

  /** The pre-built routines (Push/Pull/Legs, Upper/Lower, Full Body) - shared, read-only. */
  @Transactional(readOnly = true)
  public List<RoutineResponse> templates() {
    return toResponses(routineRepository.findAllByUserIdIsNullOrderByTemplateGroupAscIdAsc());
  }

  @Transactional(readOnly = true)
  public RoutineResponse get(UUID userId, UUID id) {
    return toResponses(List.of(findOwned(userId, id))).get(0);
  }

  public RoutineResponse create(UUID userId, SaveRoutineRequest request) {
    Routine routine = routineRepository.save(Routine.builder().userId(userId).build());
    return save(userId, routine, request);
  }

  public RoutineResponse update(UUID userId, UUID id, SaveRoutineRequest request) {
    return save(userId, findOwned(userId, id), request);
  }

  public void delete(UUID userId, UUID id) {
    // Sessions started from it keep their own copy of the sets and just lose the back-reference
    // (routine_id is ON DELETE SET NULL).
    routineRepository.delete(findOwned(userId, id));
  }

  /** Copies a template into the user's own routines, which they can then edit freely. */
  public RoutineResponse copyTemplate(UUID userId, UUID templateId) {
    Routine template =
        routineRepository.findByIdAndUserIdIsNull(templateId).orElseThrow(() -> ResourceNotFoundException.of("Template", templateId));
    Routine copy =
        routineRepository.save(
            Routine.builder().userId(userId).name(template.getName()).description(template.getDescription()).build());
    for (RoutineExercise source : routineExerciseRepository.findAllByRoutineIdOrderByPositionAsc(templateId)) {
      routineExerciseRepository.save(
          RoutineExercise.builder()
              .routineId(copy.getId())
              .exerciseId(source.getExerciseId())
              .position(source.getPosition())
              .targetSets(source.getTargetSets())
              .targetReps(source.getTargetReps())
              .targetWeight(source.getTargetWeight())
              .restSeconds(source.getRestSeconds())
              .build());
    }
    return toResponses(List.of(copy)).get(0);
  }

  public Routine findOwned(UUID userId, UUID id) {
    return routineRepository.findByIdAndUserId(id, userId).orElseThrow(() -> ResourceNotFoundException.of("Routine", id));
  }

  public List<RoutineExercise> exercisesOf(UUID routineId) {
    return routineExerciseRepository.findAllByRoutineIdOrderByPositionAsc(routineId);
  }

  private RoutineResponse save(UUID userId, Routine routine, SaveRoutineRequest request) {
    routine.setName(request.name().trim());
    routine.setDescription(request.description() == null || request.description().isBlank() ? null : request.description().trim());
    routineRepository.save(routine);

    List<RoutineExerciseInput> inputs = request.exercises() == null ? List.of() : request.exercises();
    // Validate every exercise is usable before touching the stored list, so a bad id can't leave
    // the routine half-rewritten.
    for (RoutineExerciseInput input : inputs) {
      exerciseService.requireVisible(userId, input.exerciseId());
    }
    if (inputs.stream().map(RoutineExerciseInput::exerciseId).distinct().count() != inputs.size()) {
      throw new InvalidRequestException("Each exercise can only appear once in a routine");
    }

    routineExerciseRepository.deleteAllByRoutineId(routine.getId());
    routineExerciseRepository.flush();
    List<RoutineExercise> rows = new ArrayList<>();
    for (int i = 0; i < inputs.size(); i++) {
      RoutineExerciseInput input = inputs.get(i);
      rows.add(
          RoutineExercise.builder()
              .routineId(routine.getId())
              .exerciseId(input.exerciseId())
              .position(i + 1)
              .targetSets(input.targetSets() == null ? DEFAULT_SETS : input.targetSets())
              .targetReps(input.targetReps() == null ? DEFAULT_REPS : input.targetReps())
              .targetWeight(input.targetWeight())
              .restSeconds(input.restSeconds() == null ? DEFAULT_REST_SECONDS : input.restSeconds())
              .build());
    }
    routineExerciseRepository.saveAll(rows);
    return toResponses(List.of(routine)).get(0);
  }

  private List<RoutineResponse> toResponses(List<Routine> routines) {
    if (routines.isEmpty()) return List.of();
    Map<UUID, List<RoutineExercise>> byRoutine =
        routineExerciseRepository.findAllByRoutineIdIn(routines.stream().map(Routine::getId).toList()).stream()
            .collect(Collectors.groupingBy(RoutineExercise::getRoutineId));
    Map<UUID, Exercise> exercises =
        exerciseRepository
            .findAllByIdIn(byRoutine.values().stream().flatMap(List::stream).map(RoutineExercise::getExerciseId).distinct().toList())
            .stream()
            .collect(Collectors.toMap(Exercise::getId, e -> e));

    return routines.stream()
        .map(
            r ->
                new RoutineResponse(
                    r.getId(),
                    r.getName(),
                    r.getDescription(),
                    r.getTemplateGroup(),
                    r.getUserId() == null,
                    byRoutine.getOrDefault(r.getId(), List.of()).stream()
                        .sorted(java.util.Comparator.comparing(RoutineExercise::getPosition))
                        .map(
                            re ->
                                new RoutineExerciseResponse(
                                    re.getExerciseId(),
                                    exercises.get(re.getExerciseId()).getName(),
                                    exercises.get(re.getExerciseId()).getCategory(),
                                    re.getPosition(),
                                    re.getTargetSets(),
                                    re.getTargetReps(),
                                    re.getTargetWeight(),
                                    re.getRestSeconds()))
                        .toList()))
        .toList();
  }
}
