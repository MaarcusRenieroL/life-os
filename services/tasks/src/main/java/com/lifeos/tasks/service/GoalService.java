package com.lifeos.tasks.service;

import com.lifeos.tasks.domains.dto.request.CreateGoalRequest;
import com.lifeos.tasks.domains.dto.response.GoalResponse;
import com.lifeos.tasks.domains.entity.Goal;
import com.lifeos.tasks.exception.ResourceNotFoundException;
import com.lifeos.tasks.repository.GoalRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class GoalService {

  private final GoalRepository goalRepository;

  @Transactional(readOnly = true)
  public List<GoalResponse> list(UUID userId) {
    return goalRepository.findAllByUserIdOrderByNameAsc(userId).stream().map(this::toResponse).toList();
  }

  public GoalResponse create(UUID userId, CreateGoalRequest request) {
    Goal goal = Goal.builder().userId(userId).name(request.getName().trim()).build();
    return toResponse(goalRepository.save(goal));
  }

  public void delete(UUID userId, UUID id) {
    Goal goal =
        goalRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> ResourceNotFoundException.of("Goal", id));
    goalRepository.delete(goal);
  }

  private GoalResponse toResponse(Goal goal) {
    return GoalResponse.builder()
        .id(goal.getId())
        .name(goal.getName())
        .createdAt(goal.getCreatedAt())
        .build();
  }
}
