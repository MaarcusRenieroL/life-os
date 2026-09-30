package com.lifeos.tasks.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.tasks.domains.dto.request.CreateProjectRequest;
import com.lifeos.tasks.domains.dto.response.ProjectResponse;
import com.lifeos.tasks.service.ProjectService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** A minimal named lookup so the frontend can render "link to project" as a real searchable
 * dropdown instead of a raw UUID field - see Project's javadoc. Exposed under /v1/tasks so
 * calendar (and anything else) can read the same list by hitting this service directly. */
@RestController
@RequestMapping("/v1/tasks/projects")
@RequiredArgsConstructor
public class ProjectController {

  private final ProjectService projectService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<ProjectResponse>>> list(Authentication authentication) {
    return ResponseEntity.ok(
        ApiResponse.success(projectService.list(userId(authentication)), "Projects fetched successfully"));
  }

  @PostMapping
  public ResponseEntity<ApiResponse<ProjectResponse>> create(
      Authentication authentication, @Valid @RequestBody CreateProjectRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(projectService.create(userId(authentication), request), "Project created successfully"));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<ApiResponse<Void>> delete(Authentication authentication, @PathVariable UUID id) {
    projectService.delete(userId(authentication), id);
    return ResponseEntity.ok(ApiResponse.success(null, "Project deleted successfully"));
  }

  private UUID userId(Authentication authentication) {
    return (UUID) authentication.getPrincipal();
  }
}
