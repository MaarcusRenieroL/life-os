package com.lifeos.tasks.service;

import com.lifeos.tasks.domains.dto.request.CreateProjectRequest;
import com.lifeos.tasks.domains.dto.response.ProjectResponse;
import com.lifeos.tasks.domains.entity.Project;
import com.lifeos.tasks.exception.ResourceNotFoundException;
import com.lifeos.tasks.repository.ProjectRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class ProjectService {

  private final ProjectRepository projectRepository;

  @Transactional(readOnly = true)
  public List<ProjectResponse> list(UUID userId) {
    return projectRepository.findAllByUserIdOrderByNameAsc(userId).stream().map(this::toResponse).toList();
  }

  public ProjectResponse create(UUID userId, CreateProjectRequest request) {
    Project project = Project.builder().userId(userId).name(request.getName().trim()).build();
    return toResponse(projectRepository.save(project));
  }

  public void delete(UUID userId, UUID id) {
    Project project =
        projectRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> ResourceNotFoundException.of("Project", id));
    projectRepository.delete(project);
  }

  private ProjectResponse toResponse(Project project) {
    return ProjectResponse.builder()
        .id(project.getId())
        .name(project.getName())
        .createdAt(project.getCreatedAt())
        .build();
  }
}
