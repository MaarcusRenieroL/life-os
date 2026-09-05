package com.lifeos.job_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.job_tracker.domains.dto.request.TailorVariantForJobRequest;
import com.lifeos.job_tracker.domains.dto.response.ResumeTailoringResponse;
import com.lifeos.job_tracker.service.ResumeTailoringService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class ResumeTailoringController extends AuthenticatedController {

  private final ResumeTailoringService resumeTailoringService;

  @PostMapping("/v1/resumes/variants/{variantId}/tailor-for-job/{jobListingId}")
  public ResponseEntity<ApiResponse<ResumeTailoringResponse>> tailorForJob(
      Authentication authentication,
      @PathVariable UUID variantId,
      @PathVariable UUID jobListingId,
      @RequestBody(required = false) TailorVariantForJobRequest request) {
    TailorVariantForJobRequest body = request == null ? new TailorVariantForJobRequest(null, null) : request;
    ResumeTailoringResponse response =
        ResumeTailoringResponse.from(
            resumeTailoringService.tailorForJob(
                userId(authentication), variantId, jobListingId, body.customInstructions(), body.applicationId()));
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response, "Resume tailored"));
  }

  @GetMapping("/v1/resume-tailorings/{tailoringId}")
  public ResponseEntity<ApiResponse<ResumeTailoringResponse>> get(
      Authentication authentication, @PathVariable UUID tailoringId) {
    return ResponseEntity.ok(
        ApiResponse.success(
            ResumeTailoringResponse.from(resumeTailoringService.get(userId(authentication), tailoringId)),
            "Resume tailoring fetched"));
  }

  @GetMapping("/v1/resume-tailorings/{tailoringId}/pdf")
  public ResponseEntity<byte[]> pdf(Authentication authentication, @PathVariable UUID tailoringId) {
    byte[] pdf = resumeTailoringService.downloadPdf(userId(authentication), tailoringId);
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"tailored-resume.pdf\"")
        .contentType(MediaType.APPLICATION_PDF)
        .body(pdf);
  }

  @GetMapping("/v1/jobs/{jobListingId}/resume-tailorings")
  public ResponseEntity<ApiResponse<List<ResumeTailoringResponse>>> listForJob(
      Authentication authentication, @PathVariable UUID jobListingId) {
    List<ResumeTailoringResponse> body =
        resumeTailoringService.listForJob(userId(authentication), jobListingId).stream()
            .map(ResumeTailoringResponse::from)
            .toList();
    return ResponseEntity.ok(ApiResponse.success(body, "Resume tailorings fetched"));
  }

  @GetMapping("/v1/applications/{applicationId}/resume-tailoring")
  public ResponseEntity<ApiResponse<ResumeTailoringResponse>> getForApplication(
      Authentication authentication, @PathVariable UUID applicationId) {
    return ResponseEntity.ok(
        ApiResponse.success(
            ResumeTailoringResponse.from(
                resumeTailoringService.getForApplication(userId(authentication), applicationId)),
            "Resume tailoring fetched"));
  }
}
