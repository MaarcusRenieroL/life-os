package com.lifeos.job_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.job_tracker.domains.dto.response.ResumeTemplateResponse;
import com.lifeos.job_tracker.repository.ResumeTemplateRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The 5 system resume styling templates (Modern/Classic/Minimal/Creative/Elegant) - read-only, seeded by migration. */
@RestController
@RequestMapping("/v1/resume-templates")
@RequiredArgsConstructor
public class ResumeTemplateController {

  private final ResumeTemplateRepository resumeTemplateRepository;

  @GetMapping
  public ResponseEntity<ApiResponse<List<ResumeTemplateResponse>>> list() {
    List<ResumeTemplateResponse> body =
        resumeTemplateRepository.findAllByOrderByNameAsc().stream().map(ResumeTemplateResponse::from).toList();
    return ResponseEntity.ok(ApiResponse.success(body, "Resume templates fetched"));
  }
}
