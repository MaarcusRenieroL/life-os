package com.lifeos.job_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.job_tracker.domains.dto.request.UpsertSkillRequest;
import com.lifeos.job_tracker.domains.dto.response.SkillResponse;
import com.lifeos.job_tracker.service.SkillService;
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

@RestController
@RequestMapping("/v1/skills")
@RequiredArgsConstructor
public class SkillController extends AuthenticatedController {

  private final SkillService skillService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<SkillResponse>>> list(Authentication authentication) {
    List<SkillResponse> body =
        skillService.list(userId(authentication)).stream().map(SkillResponse::from).toList();
    return ResponseEntity.ok(ApiResponse.success(body, "Skills fetched"));
  }

  @PostMapping
  public ResponseEntity<ApiResponse<SkillResponse>> upsert(
      Authentication authentication, @Valid @RequestBody UpsertSkillRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            SkillResponse.from(skillService.upsert(userId(authentication), request)), "Skill saved"));
  }

  @DeleteMapping("/{skillId}")
  public ResponseEntity<ApiResponse<Void>> delete(
      Authentication authentication, @PathVariable UUID skillId) {
    skillService.delete(userId(authentication), skillId);
    return ResponseEntity.ok(ApiResponse.success(null, "Skill deleted"));
  }
}
