package com.lifeos.job_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.job_tracker.domains.dto.request.UpsertCoverLetterTemplateRequest;
import com.lifeos.job_tracker.domains.dto.response.CoverLetterTemplateResponse;
import com.lifeos.job_tracker.service.CoverLetterTemplateService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
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
@RequestMapping("/v1/cover-letter-templates")
@RequiredArgsConstructor
public class CoverLetterTemplateController extends AuthenticatedController {

  private final CoverLetterTemplateService coverLetterTemplateService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<CoverLetterTemplateResponse>>> list(Authentication authentication) {
    List<CoverLetterTemplateResponse> body =
        coverLetterTemplateService.list(userId(authentication)).stream()
            .map(CoverLetterTemplateResponse::from)
            .toList();
    return ResponseEntity.ok(ApiResponse.success(body, "Cover letter templates fetched"));
  }

  @PostMapping
  public ResponseEntity<ApiResponse<CoverLetterTemplateResponse>> create(
      Authentication authentication, @Valid @RequestBody UpsertCoverLetterTemplateRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(
            ApiResponse.success(
                CoverLetterTemplateResponse.from(coverLetterTemplateService.create(userId(authentication), request)),
                "Cover letter template created"));
  }

  @PutMapping("/{templateId}")
  public ResponseEntity<ApiResponse<CoverLetterTemplateResponse>> update(
      Authentication authentication, @PathVariable UUID templateId, @Valid @RequestBody UpsertCoverLetterTemplateRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            CoverLetterTemplateResponse.from(
                coverLetterTemplateService.update(userId(authentication), templateId, request)),
            "Cover letter template updated"));
  }

  @DeleteMapping("/{templateId}")
  public ResponseEntity<ApiResponse<Void>> delete(Authentication authentication, @PathVariable UUID templateId) {
    coverLetterTemplateService.delete(userId(authentication), templateId);
    return ResponseEntity.ok(ApiResponse.success(null, "Cover letter template deleted"));
  }
}
