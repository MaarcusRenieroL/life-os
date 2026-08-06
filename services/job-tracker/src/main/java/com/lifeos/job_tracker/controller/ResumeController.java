package com.lifeos.job_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.job_tracker.domains.dto.response.ResumeUploadResponse;
import com.lifeos.job_tracker.domains.entity.ResumeTemplate;
import com.lifeos.job_tracker.domains.record.ResumeUploadResult;
import com.lifeos.job_tracker.exception.ResumeNotFoundException;
import com.lifeos.job_tracker.repository.ResumeTemplateRepository;
import com.lifeos.job_tracker.service.ResumeService;
import java.io.IOException;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/v1/jobs/resumes")
@RequiredArgsConstructor
public class ResumeController {

  private final ResumeService resumeService;
  private final ResumeTemplateRepository resumeTemplateRepository;

  @PostMapping("/upload")
  public ResponseEntity<ApiResponse<ResumeUploadResponse>> uploadResume(
      Authentication authentication, @RequestParam("file") MultipartFile file) throws IOException {
    ResumeUploadResult result = resumeService.upload(authentication, file);

    ResumeUploadResponse response =
        ResumeUploadResponse.builder()
            .id(result.resumeTemplate().getId())
            .version(result.resumeTemplate().getVersion())
            .isActive(Boolean.TRUE.equals(result.resumeTemplate().getIsActive()))
            .uploadedAt(result.resumeTemplate().getUploadedAt())
            .resumeText(result.resumeText())
            .build();

    return ResponseEntity.ok(ApiResponse.success(response, "Resume uploaded successfully"));
  }

  @GetMapping("/active")
  public ResponseEntity<ApiResponse<ResumeUploadResponse>> getActiveResume(
      Authentication authentication) {
    UUID userId = (UUID) authentication.getPrincipal();

    ResumeTemplate resumeTemplate =
        resumeTemplateRepository
            .findByUserIdAndIsActiveTrue(userId)
            .orElseThrow(ResumeNotFoundException::new);

    // resumeText isn't persisted anywhere - it's only ever returned once,
    // at upload time. Callers needing it again would need to re-upload or
    // we'd need to add a text column to ResumeTemplate later.
    ResumeUploadResponse response =
        ResumeUploadResponse.builder()
            .id(resumeTemplate.getId())
            .version(resumeTemplate.getVersion())
            .isActive(Boolean.TRUE.equals(resumeTemplate.getIsActive()))
            .uploadedAt(resumeTemplate.getUploadedAt())
            .build();

    return ResponseEntity.ok(ApiResponse.success(response, "Active resume fetched successfully"));
  }
}
