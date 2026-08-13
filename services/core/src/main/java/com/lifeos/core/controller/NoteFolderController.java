package com.lifeos.core.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.core.domains.dto.request.CreateFolderRequest;
import com.lifeos.core.domains.dto.request.RenameFolderRequest;
import com.lifeos.core.domains.dto.response.FolderResponse;
import com.lifeos.core.service.NoteFolderService;
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
@RequestMapping("/v1/folders")
@RequiredArgsConstructor
public class NoteFolderController {

  private final NoteFolderService noteFolderService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<FolderResponse>>> list(Authentication authentication) {
    return ResponseEntity.ok(
        ApiResponse.success(noteFolderService.getTree(userId(authentication)), "Folders fetched successfully"));
  }

  @PostMapping
  public ResponseEntity<ApiResponse<FolderResponse>> create(
      Authentication authentication, @Valid @RequestBody CreateFolderRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            noteFolderService.create(userId(authentication), request), "Folder created successfully"));
  }

  @PutMapping("/{id}")
  public ResponseEntity<ApiResponse<FolderResponse>> rename(
      Authentication authentication, @PathVariable UUID id, @Valid @RequestBody RenameFolderRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            noteFolderService.rename(userId(authentication), id, request), "Folder renamed successfully"));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<ApiResponse<Void>> delete(
      Authentication authentication, @PathVariable UUID id, @RequestParam(defaultValue = "false") boolean cascade) {
    noteFolderService.delete(userId(authentication), id, cascade);
    return ResponseEntity.ok(ApiResponse.success(null, "Folder deleted successfully"));
  }

  private UUID userId(Authentication authentication) {
    return (UUID) authentication.getPrincipal();
  }
}
