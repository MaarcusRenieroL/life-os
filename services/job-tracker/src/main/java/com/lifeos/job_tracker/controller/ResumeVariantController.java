package com.lifeos.job_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.job_tracker.domains.dto.request.CloneResumeVariantRequest;
import com.lifeos.job_tracker.domains.dto.request.CompareVariantsRequest;
import com.lifeos.job_tracker.domains.dto.request.CreateResumeVariantRequest;
import com.lifeos.job_tracker.domains.dto.request.DuplicateForJobRequest;
import com.lifeos.job_tracker.domains.dto.request.UpdateResumeVariantRequest;
import com.lifeos.job_tracker.domains.dto.response.ResumeSectionResponse;
import com.lifeos.job_tracker.domains.dto.response.ResumeVariantResponse;
import com.lifeos.job_tracker.service.ResumeExportService;
import com.lifeos.job_tracker.service.ResumeVariantService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
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
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/resumes/variants")
@RequiredArgsConstructor
public class ResumeVariantController extends AuthenticatedController {

  private final ResumeVariantService resumeVariantService;
  private final ResumeExportService resumeExportService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<ResumeVariantResponse>>> list(Authentication authentication) {
    List<ResumeVariantResponse> body =
        resumeVariantService.list(userId(authentication)).stream().map(ResumeVariantResponse::from).toList();
    return ResponseEntity.ok(ApiResponse.success(body, "Resume variants fetched"));
  }

  @GetMapping("/{variantId}")
  public ResponseEntity<ApiResponse<ResumeVariantResponse>> get(
      Authentication authentication, @PathVariable UUID variantId) {
    UUID uid = userId(authentication);
    List<ResumeSectionResponse> sections =
        resumeVariantService.sections(uid, variantId).stream().map(ResumeSectionResponse::from).toList();
    return ResponseEntity.ok(
        ApiResponse.success(
            ResumeVariantResponse.from(resumeVariantService.get(uid, variantId), sections), "Resume variant fetched"));
  }

  @PostMapping
  public ResponseEntity<ApiResponse<ResumeVariantResponse>> create(
      Authentication authentication, @Valid @RequestBody CreateResumeVariantRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(
            ApiResponse.success(
                ResumeVariantResponse.from(resumeVariantService.create(userId(authentication), request)),
                "Resume variant created"));
  }

  @PutMapping("/{variantId}")
  public ResponseEntity<ApiResponse<ResumeVariantResponse>> update(
      Authentication authentication, @PathVariable UUID variantId, @RequestBody UpdateResumeVariantRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            ResumeVariantResponse.from(resumeVariantService.update(userId(authentication), variantId, request)),
            "Resume variant updated"));
  }

  @DeleteMapping("/{variantId}")
  public ResponseEntity<ApiResponse<Void>> delete(Authentication authentication, @PathVariable UUID variantId) {
    resumeVariantService.delete(userId(authentication), variantId);
    return ResponseEntity.ok(ApiResponse.success(null, "Resume variant deleted"));
  }

  @PostMapping("/{variantId}/clone")
  public ResponseEntity<ApiResponse<ResumeVariantResponse>> clone(
      Authentication authentication, @PathVariable UUID variantId, @Valid @RequestBody CloneResumeVariantRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(
            ApiResponse.success(
                ResumeVariantResponse.from(
                    resumeVariantService.clone(userId(authentication), variantId, request.newName())),
                "Resume variant cloned"));
  }

  @PostMapping("/{variantId}/duplicate-for-job")
  public ResponseEntity<ApiResponse<ResumeVariantResponse>> duplicateForJob(
      Authentication authentication, @PathVariable UUID variantId, @Valid @RequestBody DuplicateForJobRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(
            ApiResponse.success(
                ResumeVariantResponse.from(
                    resumeVariantService.duplicateForJob(userId(authentication), variantId, request.jobListingId())),
                "Resume variant duplicated for job"));
  }

  @GetMapping("/{variantId}/pdf")
  public ResponseEntity<byte[]> pdf(Authentication authentication, @PathVariable UUID variantId) {
    byte[] pdf = resumeExportService.toPdf(userId(authentication), variantId);
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"resume.pdf\"")
        .contentType(MediaType.APPLICATION_PDF)
        .body(pdf);
  }

  @GetMapping("/{variantId}/json")
  public ResponseEntity<ApiResponse<ResumeVariantResponse>> json(
      Authentication authentication, @PathVariable UUID variantId) {
    return ResponseEntity.ok(
        ApiResponse.success(resumeExportService.toJson(userId(authentication), variantId), "Resume variant exported"));
  }

  @PostMapping("/{variantId}/compare")
  public ResponseEntity<ApiResponse<Map<String, Object>>> compare(
      Authentication authentication, @PathVariable UUID variantId, @Valid @RequestBody CompareVariantsRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            resumeExportService.compare(userId(authentication), variantId, request.otherVariantIds()),
            "Comparison computed"));
  }
}
