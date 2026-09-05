package com.lifeos.job_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.job_tracker.domains.dto.request.AddAccomplishmentToSectionRequest;
import com.lifeos.job_tracker.domains.dto.request.UpsertAccomplishmentRequest;
import com.lifeos.job_tracker.domains.dto.response.AccomplishmentResponse;
import com.lifeos.job_tracker.domains.dto.response.ResumeSectionResponse;
import com.lifeos.job_tracker.service.AccomplishmentService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/accomplishments")
@RequiredArgsConstructor
public class AccomplishmentController extends AuthenticatedController {

  private final AccomplishmentService accomplishmentService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<AccomplishmentResponse>>> list(
      Authentication authentication,
      @RequestParam(required = false) String category,
      @RequestParam(required = false) String search) {
    List<AccomplishmentResponse> body =
        accomplishmentService.list(userId(authentication), category, search).stream()
            .map(AccomplishmentResponse::from)
            .toList();
    return ResponseEntity.ok(ApiResponse.success(body, "Accomplishments fetched"));
  }

  @PostMapping
  public ResponseEntity<ApiResponse<AccomplishmentResponse>> create(
      Authentication authentication, @Valid @RequestBody UpsertAccomplishmentRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(
            ApiResponse.success(
                AccomplishmentResponse.from(accomplishmentService.create(userId(authentication), request)),
                "Accomplishment created"));
  }

  @PutMapping("/{accomplishmentId}")
  public ResponseEntity<ApiResponse<AccomplishmentResponse>> update(
      Authentication authentication,
      @PathVariable UUID accomplishmentId,
      @Valid @RequestBody UpsertAccomplishmentRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            AccomplishmentResponse.from(
                accomplishmentService.update(userId(authentication), accomplishmentId, request)),
            "Accomplishment updated"));
  }

  @DeleteMapping("/{accomplishmentId}")
  public ResponseEntity<ApiResponse<Void>> delete(
      Authentication authentication, @PathVariable UUID accomplishmentId) {
    accomplishmentService.delete(userId(authentication), accomplishmentId);
    return ResponseEntity.ok(ApiResponse.success(null, "Accomplishment deleted"));
  }

  @PostMapping("/{accomplishmentId}/add-to-section")
  public ResponseEntity<ApiResponse<ResumeSectionResponse>> addToSection(
      Authentication authentication,
      @PathVariable UUID accomplishmentId,
      @Valid @RequestBody AddAccomplishmentToSectionRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            ResumeSectionResponse.from(
                accomplishmentService.addToSection(
                    userId(authentication), accomplishmentId, request.resumeVariantId(), request.sectionId())),
            "Added to section"));
  }
}
