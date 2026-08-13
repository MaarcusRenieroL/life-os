package com.lifeos.core.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.core.domains.dto.request.CreateTagRequest;
import com.lifeos.core.domains.dto.request.UpdateTagRequest;
import com.lifeos.core.domains.dto.response.TagResponse;
import com.lifeos.core.service.TagService;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/tags")
@RequiredArgsConstructor
public class TagController {

  private final TagService tagService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<TagResponse>>> list(
      Authentication authentication,
      @RequestParam(required = false) String search,
      @RequestParam(defaultValue = "100") int limit) {
    return ResponseEntity.ok(
        ApiResponse.success(
            tagService.search(userId(authentication), search, limit), "Tags fetched successfully"));
  }

  @PostMapping
  public ResponseEntity<ApiResponse<TagResponse>> create(
      Authentication authentication, @Valid @RequestBody CreateTagRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(tagService.create(userId(authentication), request), "Tag created successfully"));
  }

  @PutMapping("/{id}")
  public ResponseEntity<ApiResponse<TagResponse>> update(
      Authentication authentication, @PathVariable UUID id, @Valid @RequestBody UpdateTagRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(tagService.update(userId(authentication), id, request), "Tag updated successfully"));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<ApiResponse<Void>> delete(Authentication authentication, @PathVariable UUID id) {
    tagService.delete(userId(authentication), id);
    return ResponseEntity.ok(ApiResponse.success(null, "Tag deleted successfully"));
  }

  private UUID userId(Authentication authentication) {
    return (UUID) authentication.getPrincipal();
  }
}
