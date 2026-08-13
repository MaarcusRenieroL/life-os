package com.lifeos.core.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.core.domains.dto.request.CreateTemplateRequest;
import com.lifeos.core.domains.dto.request.UpdateTemplateRequest;
import com.lifeos.core.domains.dto.request.UseTemplateRequest;
import com.lifeos.core.domains.dto.response.NoteResponse;
import com.lifeos.core.domains.dto.response.TemplateResponse;
import com.lifeos.core.domains.record.PageResponse;
import com.lifeos.core.service.NoteTemplateService;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
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
@RequestMapping("/v1/templates")
@RequiredArgsConstructor
public class NoteTemplateController {

  private final NoteTemplateService noteTemplateService;

  @GetMapping
  public ResponseEntity<ApiResponse<PageResponse<TemplateResponse>>> list(
      Authentication authentication,
      @RequestParam(required = false) String category,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    return ResponseEntity.ok(
        ApiResponse.success(
            PageResponse.from(
                noteTemplateService.list(userId(authentication), category, PageRequest.of(page, size))),
            "Templates fetched successfully"));
  }

  @PostMapping
  public ResponseEntity<ApiResponse<TemplateResponse>> create(
      Authentication authentication, @Valid @RequestBody CreateTemplateRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            noteTemplateService.create(userId(authentication), request), "Template created successfully"));
  }

  @PutMapping("/{id}")
  public ResponseEntity<ApiResponse<TemplateResponse>> update(
      Authentication authentication, @PathVariable UUID id, @Valid @RequestBody UpdateTemplateRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            noteTemplateService.update(userId(authentication), id, request), "Template updated successfully"));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<ApiResponse<Void>> delete(Authentication authentication, @PathVariable UUID id) {
    noteTemplateService.delete(userId(authentication), id);
    return ResponseEntity.ok(ApiResponse.success(null, "Template deleted successfully"));
  }

  @PostMapping("/{id}/use")
  public ResponseEntity<ApiResponse<NoteResponse>> use(
      Authentication authentication, @PathVariable UUID id, @Valid @RequestBody UseTemplateRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            noteTemplateService.use(userId(authentication), id, request), "Note created from template successfully"));
  }

  private UUID userId(Authentication authentication) {
    return (UUID) authentication.getPrincipal();
  }
}
