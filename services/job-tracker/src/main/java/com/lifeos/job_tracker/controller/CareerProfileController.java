package com.lifeos.job_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.job_tracker.domains.dto.request.UpsertCareerProfileRequest;
import com.lifeos.job_tracker.domains.dto.request.UpsertProjectRequest;
import com.lifeos.job_tracker.domains.dto.request.UpsertWorkExperienceRequest;
import com.lifeos.job_tracker.domains.dto.response.CareerProfileBundleResponse;
import com.lifeos.job_tracker.domains.dto.response.CareerProfileResponse;
import com.lifeos.job_tracker.domains.dto.response.ProjectResponse;
import com.lifeos.job_tracker.domains.dto.response.SkillResponse;
import com.lifeos.job_tracker.domains.dto.response.WorkExperienceResponse;
import com.lifeos.job_tracker.service.CareerProfileService;
import com.lifeos.job_tracker.service.SkillService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/v1/career-profile")
@RequiredArgsConstructor
public class CareerProfileController extends AuthenticatedController {

  private final CareerProfileService careerProfileService;
  private final SkillService skillService;

  /** The onboarding gate check plus everything the profile page shows - one call. */
  @GetMapping
  public ResponseEntity<ApiResponse<CareerProfileBundleResponse>> get(Authentication authentication) {
    UUID userId = userId(authentication);
    boolean onboarded = careerProfileService.isOnboarded(userId);
    CareerProfileBundleResponse body =
        new CareerProfileBundleResponse(
            onboarded,
            onboarded ? CareerProfileResponse.from(careerProfileService.getProfile(userId)) : null,
            careerProfileService.listExperiences(userId).stream().map(WorkExperienceResponse::from).toList(),
            careerProfileService.listProjects(userId).stream().map(ProjectResponse::from).toList(),
            skillService.list(userId).stream().map(SkillResponse::from).toList());
    return ResponseEntity.ok(ApiResponse.success(body, "Career profile fetched"));
  }

  /** Creating this row is what completes onboarding - the manual-entry path's final step. */
  @PutMapping
  public ResponseEntity<ApiResponse<CareerProfileResponse>> upsert(
      Authentication authentication, @RequestBody UpsertCareerProfileRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            CareerProfileResponse.from(careerProfileService.upsertProfile(userId(authentication), request)),
            "Career profile saved"));
  }

  /** The upload path's one-shot seed: parses a resume into the full structured profile, which
   * also completes onboarding. */
  @PostMapping(path = "/seed-from-resume", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<ApiResponse<CareerProfileResponse>> seedFromResume(
      Authentication authentication, @RequestPart("file") MultipartFile file) {
    return ResponseEntity.ok(
        ApiResponse.success(
            CareerProfileResponse.from(careerProfileService.seedFromResume(userId(authentication), file)),
            "Career profile imported from resume"));
  }

  @PostMapping("/work-experiences")
  public ResponseEntity<ApiResponse<WorkExperienceResponse>> createExperience(
      Authentication authentication, @Valid @RequestBody UpsertWorkExperienceRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            WorkExperienceResponse.from(
                careerProfileService.upsertExperience(userId(authentication), null, request)),
            "Work experience added"));
  }

  @PutMapping("/work-experiences/{experienceId}")
  public ResponseEntity<ApiResponse<WorkExperienceResponse>> updateExperience(
      Authentication authentication,
      @PathVariable UUID experienceId,
      @Valid @RequestBody UpsertWorkExperienceRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            WorkExperienceResponse.from(
                careerProfileService.upsertExperience(userId(authentication), experienceId, request)),
            "Work experience updated"));
  }

  @DeleteMapping("/work-experiences/{experienceId}")
  public ResponseEntity<ApiResponse<Void>> deleteExperience(
      Authentication authentication, @PathVariable UUID experienceId) {
    careerProfileService.deleteExperience(userId(authentication), experienceId);
    return ResponseEntity.ok(ApiResponse.success(null, "Work experience deleted"));
  }

  @PostMapping("/projects")
  public ResponseEntity<ApiResponse<ProjectResponse>> createProject(
      Authentication authentication, @Valid @RequestBody UpsertProjectRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            ProjectResponse.from(careerProfileService.upsertProject(userId(authentication), null, request)),
            "Project added"));
  }

  @PutMapping("/projects/{projectId}")
  public ResponseEntity<ApiResponse<ProjectResponse>> updateProject(
      Authentication authentication, @PathVariable UUID projectId, @Valid @RequestBody UpsertProjectRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            ProjectResponse.from(careerProfileService.upsertProject(userId(authentication), projectId, request)),
            "Project updated"));
  }

  @DeleteMapping("/projects/{projectId}")
  public ResponseEntity<ApiResponse<Void>> deleteProject(
      Authentication authentication, @PathVariable UUID projectId) {
    careerProfileService.deleteProject(userId(authentication), projectId);
    return ResponseEntity.ok(ApiResponse.success(null, "Project deleted"));
  }
}
