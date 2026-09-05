package com.lifeos.job_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.job_tracker.domains.dto.request.GenerateCoverLetterRequest;
import com.lifeos.job_tracker.domains.dto.request.UpdateCoverLetterRequest;
import com.lifeos.job_tracker.domains.dto.response.CoverLetterResponse;
import com.lifeos.job_tracker.domains.dto.response.CoverLetterVersionResponse;
import com.lifeos.job_tracker.service.CoverLetterService;
import jakarta.validation.Valid;
import java.util.List;
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
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class CoverLetterController extends AuthenticatedController {

  private final CoverLetterService coverLetterService;

  @PostMapping("/v1/applications/{applicationId}/cover-letter/generate")
  public ResponseEntity<ApiResponse<CoverLetterResponse>> generate(
      Authentication authentication,
      @PathVariable UUID applicationId,
      @RequestBody(required = false) GenerateCoverLetterRequest request) {
    GenerateCoverLetterRequest body = request == null ? new GenerateCoverLetterRequest(null, null, null, null, null) : request;
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(
            ApiResponse.success(
                CoverLetterResponse.from(coverLetterService.generate(userId(authentication), applicationId, body)),
                "Cover letter generated"));
  }

  @GetMapping("/v1/applications/{applicationId}/cover-letter")
  public ResponseEntity<ApiResponse<CoverLetterResponse>> getForApplication(
      Authentication authentication, @PathVariable UUID applicationId) {
    return ResponseEntity.ok(
        ApiResponse.success(
            CoverLetterResponse.from(coverLetterService.getForApplication(userId(authentication), applicationId)),
            "Cover letter fetched"));
  }

  @GetMapping("/v1/cover-letters/{coverLetterId}")
  public ResponseEntity<ApiResponse<CoverLetterResponse>> get(
      Authentication authentication, @PathVariable UUID coverLetterId) {
    return ResponseEntity.ok(
        ApiResponse.success(
            CoverLetterResponse.from(coverLetterService.get(userId(authentication), coverLetterId)),
            "Cover letter fetched"));
  }

  @PutMapping("/v1/cover-letters/{coverLetterId}")
  public ResponseEntity<ApiResponse<CoverLetterResponse>> update(
      Authentication authentication, @PathVariable UUID coverLetterId, @Valid @RequestBody UpdateCoverLetterRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            CoverLetterResponse.from(
                coverLetterService.update(userId(authentication), coverLetterId, request.generatedContent())),
            "Cover letter updated"));
  }

  @DeleteMapping("/v1/cover-letters/{coverLetterId}")
  public ResponseEntity<ApiResponse<Void>> delete(Authentication authentication, @PathVariable UUID coverLetterId) {
    coverLetterService.delete(userId(authentication), coverLetterId);
    return ResponseEntity.ok(ApiResponse.success(null, "Cover letter deleted"));
  }

  @GetMapping("/v1/cover-letters/{coverLetterId}/pdf")
  public ResponseEntity<byte[]> pdf(Authentication authentication, @PathVariable UUID coverLetterId) {
    byte[] pdf = coverLetterService.downloadPdf(userId(authentication), coverLetterId);
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"cover-letter.pdf\"")
        .contentType(MediaType.APPLICATION_PDF)
        .body(pdf);
  }

  @PostMapping("/v1/cover-letters/{coverLetterId}/revert-to-generated")
  public ResponseEntity<ApiResponse<CoverLetterResponse>> revertToGenerated(
      Authentication authentication, @PathVariable UUID coverLetterId) {
    return ResponseEntity.ok(
        ApiResponse.success(
            CoverLetterResponse.from(coverLetterService.revertToGenerated(userId(authentication), coverLetterId)),
            "Reverted to the AI-generated draft"));
  }

  @GetMapping("/v1/cover-letters/{coverLetterId}/versions")
  public ResponseEntity<ApiResponse<List<CoverLetterVersionResponse>>> versions(
      Authentication authentication, @PathVariable UUID coverLetterId) {
    List<CoverLetterVersionResponse> body =
        coverLetterService.versions(userId(authentication), coverLetterId).stream()
            .map(CoverLetterVersionResponse::from)
            .toList();
    return ResponseEntity.ok(ApiResponse.success(body, "Cover letter versions fetched"));
  }

  @GetMapping("/v1/cover-letters/{coverLetterId}/versions/{version}")
  public ResponseEntity<ApiResponse<CoverLetterVersionResponse>> version(
      Authentication authentication, @PathVariable UUID coverLetterId, @PathVariable int version) {
    return ResponseEntity.ok(
        ApiResponse.success(
            CoverLetterVersionResponse.from(coverLetterService.version(userId(authentication), coverLetterId, version)),
            "Cover letter version fetched"));
  }
}
