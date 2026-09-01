package com.lifeos.job_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.job_tracker.domains.dto.request.TailorResumeRequest;
import com.lifeos.job_tracker.domains.dto.response.ResumeResponse;
import com.lifeos.job_tracker.domains.dto.response.SkillResponse;
import com.lifeos.job_tracker.service.ResumeService;
import com.lifeos.job_tracker.service.ResumeService.ResumeDownload;
import com.lifeos.job_tracker.service.ResumeService.TailoredResume;
import com.lifeos.job_tracker.service.SkillService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/v1/resumes")
@RequiredArgsConstructor
public class ResumeController extends AuthenticatedController {

  private final ResumeService resumeService;
  private final SkillService skillService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<ResumeResponse>>> list(Authentication authentication) {
    List<ResumeResponse> body =
        resumeService.list(userId(authentication)).stream().map(ResumeResponse::summary).toList();
    return ResponseEntity.ok(ApiResponse.success(body, "Resumes fetched"));
  }

  @PostMapping(path = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<ApiResponse<ResumeResponse>> upload(
      Authentication authentication,
      @RequestPart("file") MultipartFile file,
      @RequestParam(required = false) String label,
      @RequestParam(defaultValue = "false") boolean base) {
    ResumeResponse body =
        ResumeResponse.from(resumeService.upload(userId(authentication), file, label, base));
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(body, "Resume uploaded"));
  }

  @GetMapping("/{resumeId}")
  public ResponseEntity<ApiResponse<ResumeResponse>> get(
      Authentication authentication, @PathVariable UUID resumeId) {
    return ResponseEntity.ok(
        ApiResponse.success(
            ResumeResponse.from(resumeService.get(userId(authentication), resumeId)), "Resume fetched"));
  }

  @GetMapping("/{resumeId}/skills")
  public ResponseEntity<ApiResponse<List<SkillResponse>>> skills(
      Authentication authentication, @PathVariable UUID resumeId) {
    resumeService.get(userId(authentication), resumeId); // ownership check
    List<SkillResponse> body =
        skillService.list(userId(authentication)).stream().map(SkillResponse::from).toList();
    return ResponseEntity.ok(ApiResponse.success(body, "Skills fetched"));
  }

  @PostMapping("/{resumeId}/tailor")
  public ResponseEntity<ApiResponse<Map<String, Object>>> tailor(
      Authentication authentication,
      @PathVariable UUID resumeId,
      @Valid @RequestBody TailorResumeRequest request) {
    TailoredResume result =
        resumeService.tailor(userId(authentication), resumeId, request.jobListingId());
    Map<String, Object> body =
        Map.of("resume", ResumeResponse.from(result.resume()), "markdown", result.markdown());
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(body, "Tailored resume generated"));
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
