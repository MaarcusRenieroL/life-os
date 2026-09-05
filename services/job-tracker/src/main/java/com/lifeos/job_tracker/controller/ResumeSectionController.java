package com.lifeos.job_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.job_tracker.domains.dto.request.AddSectionEntryRequest;
import com.lifeos.job_tracker.domains.dto.request.CreateResumeSectionRequest;
import com.lifeos.job_tracker.domains.dto.request.ReorderSectionsRequest;
import com.lifeos.job_tracker.domains.dto.request.UpdateResumeSectionRequest;
import com.lifeos.job_tracker.domains.dto.response.ResumeSectionResponse;
import com.lifeos.job_tracker.service.ResumeSectionService;
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
@RequestMapping("/v1/resumes/variants/{variantId}/sections")
@RequiredArgsConstructor
public class ResumeSectionController extends AuthenticatedController {

  private final ResumeSectionService resumeSectionService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<ResumeSectionResponse>>> list(
      Authentication authentication, @PathVariable UUID variantId) {
    List<ResumeSectionResponse> body =
        resumeSectionService.list(userId(authentication), variantId).stream()
            .map(ResumeSectionResponse::from)
            .toList();
    return ResponseEntity.ok(ApiResponse.success(body, "Sections fetched"));
  }

  @PostMapping
  public ResponseEntity<ApiResponse<ResumeSectionResponse>> create(
      Authentication authentication, @PathVariable UUID variantId, @Valid @RequestBody CreateResumeSectionRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(
            ApiResponse.success(
                ResumeSectionResponse.from(resumeSectionService.create(userId(authentication), variantId, request)),
                "Section created"));
  }

  @PutMapping("/{sectionId}")
  public ResponseEntity<ApiResponse<ResumeSectionResponse>> update(
      Authentication authentication,
      @PathVariable UUID variantId,
      @PathVariable UUID sectionId,
      @RequestBody UpdateResumeSectionRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            ResumeSectionResponse.from(
                resumeSectionService.update(userId(authentication), variantId, sectionId, request)),
            "Section updated"));
  }

  @DeleteMapping("/{sectionId}")
  public ResponseEntity<ApiResponse<Void>> delete(
      Authentication authentication, @PathVariable UUID variantId, @PathVariable UUID sectionId) {
    resumeSectionService.delete(userId(authentication), variantId, sectionId);
    return ResponseEntity.ok(ApiResponse.success(null, "Section deleted"));
  }

  @PutMapping("/reorder")
  public ResponseEntity<ApiResponse<List<ResumeSectionResponse>>> reorder(
      Authentication authentication, @PathVariable UUID variantId, @Valid @RequestBody ReorderSectionsRequest request) {
    List<ResumeSectionResponse> body =
        resumeSectionService.reorder(userId(authentication), variantId, request.sectionOrder()).stream()
            .map(ResumeSectionResponse::from)
            .toList();
    return ResponseEntity.ok(ApiResponse.success(body, "Sections reordered"));
  }

  // --- convenience: add/update/delete one entry (a job, a degree, ...) within a section's
  // content array, keyed by section type rather than section id ------------------------------

  @PostMapping("/{sectionType}/entries")
  public ResponseEntity<ApiResponse<ResumeSectionResponse>> addEntry(
      Authentication authentication,
      @PathVariable UUID variantId,
      @PathVariable String sectionType,
      @Valid @RequestBody AddSectionEntryRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(
            ApiResponse.success(
                ResumeSectionResponse.from(
                    resumeSectionService.addEntry(userId(authentication), variantId, sectionType, request.entry())),
                "Entry added"));
  }

  @PutMapping("/{sectionType}/entries/{index}")
  public ResponseEntity<ApiResponse<ResumeSectionResponse>> updateEntry(
      Authentication authentication,
      @PathVariable UUID variantId,
      @PathVariable String sectionType,
      @PathVariable int index,
      @Valid @RequestBody AddSectionEntryRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            ResumeSectionResponse.from(
                resumeSectionService.updateEntry(userId(authentication), variantId, sectionType, index, request.entry())),
            "Entry updated"));
  }

  @DeleteMapping("/{sectionType}/entries/{index}")
  public ResponseEntity<ApiResponse<ResumeSectionResponse>> deleteEntry(
      Authentication authentication, @PathVariable UUID variantId, @PathVariable String sectionType, @PathVariable int index) {
    return ResponseEntity.ok(
        ApiResponse.success(
            ResumeSectionResponse.from(
                resumeSectionService.deleteEntry(userId(authentication), variantId, sectionType, index)),
            "Entry deleted"));
  }
}
