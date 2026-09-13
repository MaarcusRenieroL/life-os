package com.lifeos.job_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.job_tracker.domains.dto.response.ResumeResponse;
import com.lifeos.job_tracker.service.ResumeService;
import com.lifeos.job_tracker.service.ResumeService.ResumeDownload;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/v1/resumes")
@RequiredArgsConstructor
public class ResumeController extends AuthenticatedController {

  private final ResumeService resumeService;

  /** The candidate's current (only) resume, or 404 if none uploaded yet. */
  @GetMapping
  public ResponseEntity<ApiResponse<ResumeResponse>> current(Authentication authentication) {
    return ResponseEntity.ok(
        ApiResponse.success(
            ResumeResponse.from(resumeService.getCurrent(userId(authentication))), "Resume fetched"));
  }

  @PostMapping(path = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<ApiResponse<ResumeResponse>> upload(
      Authentication authentication,
      @RequestPart("file") MultipartFile file,
      @RequestParam(required = false) String label) {
    ResumeResponse body =
        ResumeResponse.from(resumeService.upload(userId(authentication), file, label));
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(body, "Resume uploaded"));
  }

  @GetMapping("/{resumeId}/download")
  public ResponseEntity<byte[]> download(Authentication authentication, @PathVariable UUID resumeId) {
    ResumeDownload file = resumeService.download(userId(authentication), resumeId);
    return ResponseEntity.ok()
        .header(
            HttpHeaders.CONTENT_DISPOSITION,
            ContentDisposition.attachment().filename(file.fileName()).build().toString())
        .contentType(MediaType.parseMediaType(file.contentType()))
        .body(file.content());
  }

  @DeleteMapping("/{resumeId}")
  public ResponseEntity<ApiResponse<Void>> delete(
      Authentication authentication, @PathVariable UUID resumeId) {
    resumeService.delete(userId(authentication), resumeId);
    return ResponseEntity.ok(ApiResponse.success(null, "Resume deleted"));
  }
}
