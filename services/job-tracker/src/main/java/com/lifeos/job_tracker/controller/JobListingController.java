package com.lifeos.job_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.job_tracker.domains.dto.request.FromLinkRequest;
import com.lifeos.job_tracker.domains.dto.request.UpdateJobDetailsRequest;
import com.lifeos.job_tracker.domains.dto.request.UpdateJobListingRequest;
import com.lifeos.job_tracker.domains.dto.response.JobListingResponse;
import com.lifeos.job_tracker.domains.dto.response.JobTailoringVersionResponse;
import com.lifeos.job_tracker.domains.record.ResumeTailoringResult;
import com.lifeos.job_tracker.service.JobListingService;
import com.lifeos.job_tracker.service.JobMatchingService.JobFitResult;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/v1/jobs")
@RequiredArgsConstructor
public class JobListingController extends AuthenticatedController {

  private final JobListingService jobListingService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<JobListingResponse>>> list(Authentication authentication) {
    List<JobListingResponse> body =
        jobListingService.list(userId(authentication)).stream().map(JobListingResponse::from).toList();
    return ResponseEntity.ok(ApiResponse.success(body, "Jobs fetched"));
  }

  @GetMapping("/{jobId}")
  public ResponseEntity<ApiResponse<JobListingResponse>> get(
      Authentication authentication, @PathVariable UUID jobId) {
    return ResponseEntity.ok(
        ApiResponse.success(
            JobListingResponse.from(jobListingService.get(userId(authentication), jobId)),
            "Job fetched"));
  }

  /**
   * Add a job from a pasted link (LinkedIn, Naukri, Indeed, a company careers page). The URL is
   * fetched and parsed by Claude, then scored against the saved resume. Returns 422 when the site
   * blocked the read - the client resubmits with {@code jobDescriptionText}.
   */
  @PostMapping("/from-link")
  public ResponseEntity<ApiResponse<JobListingResponse>> fromLink(
      Authentication authentication, @RequestBody FromLinkRequest request) {
    JobListingResponse body =
        JobListingResponse.from(
            jobListingService.createFromLink(
                userId(authentication), request.url(), request.jobDescriptionText()));
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(ApiResponse.success(body, "Job added from link"));
  }

  @PatchMapping("/{jobId}")
  public ResponseEntity<ApiResponse<JobListingResponse>> updateStatus(
      Authentication authentication,
      @PathVariable UUID jobId,
      @RequestBody UpdateJobListingRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            JobListingResponse.from(
                jobListingService.updateStatus(userId(authentication), jobId, request.status())),
            "Status updated"));
  }

  @PatchMapping("/{jobId}/details")
  public ResponseEntity<ApiResponse<JobListingResponse>> updateDetails(
      Authentication authentication,
      @PathVariable UUID jobId,
      @RequestBody UpdateJobDetailsRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            JobListingResponse.from(jobListingService.updateDetails(userId(authentication), jobId, request)),
            "Details updated"));
  }

  @PostMapping("/{jobId}/cover-letter")
  public ResponseEntity<ApiResponse<JobListingResponse>> generateCoverLetter(
      Authentication authentication, @PathVariable UUID jobId) {
    return ResponseEntity.ok(
        ApiResponse.success(
            JobListingResponse.from(jobListingService.generateCoverLetter(userId(authentication), jobId)),
            "Cover letter drafted"));
  }

  @PostMapping("/{jobId}/rescore")
  public ResponseEntity<ApiResponse<JobFitResult>> rescore(
      Authentication authentication, @PathVariable UUID jobId) {
    return ResponseEntity.ok(
        ApiResponse.success(
            jobListingService.rescore(userId(authentication), jobId), "Fit score recomputed"));
  }

  /** Attaches a one-off resume PDF to this job only (e.g. one built with another tool), replacing
   * any previous override for it, and immediately recomputes the fit score against it. Doesn't
   * touch the persisted resume or skill library. */
  @PostMapping(path = "/{jobId}/resume-override", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<ApiResponse<JobListingResponse>> uploadResumeOverride(
      Authentication authentication, @PathVariable UUID jobId, @RequestPart("file") MultipartFile file) {
    return ResponseEntity.ok(
        ApiResponse.success(
            JobListingResponse.from(
                jobListingService.uploadResumeOverride(userId(authentication), jobId, file)),
            "Resume attached to this job"));
  }

  /** Removes this job's override resume and recomputes the fit score against whatever's next in
   * priority (the tailored resume, then the skill library). */
  @DeleteMapping("/{jobId}/resume-override")
  public ResponseEntity<ApiResponse<JobListingResponse>> deleteResumeOverride(
      Authentication authentication, @PathVariable UUID jobId) {
    return ResponseEntity.ok(
        ApiResponse.success(
            JobListingResponse.from(jobListingService.deleteResumeOverride(userId(authentication), jobId)),
            "Resume override removed"));
  }

  /**
   * Scores the saved resume against this job, then returns concrete improvement points and a full
   * LaTeX resume tailored to it, ready to paste into Overleaf.
   */
  @PostMapping("/{jobId}/tailor-resume")
  public ResponseEntity<ApiResponse<ResumeTailoringResult>> tailorResume(
      Authentication authentication, @PathVariable UUID jobId) {
    return ResponseEntity.ok(
        ApiResponse.success(
            jobListingService.tailorResume(userId(authentication), jobId), "Resume tailored"));
  }

  @GetMapping("/{jobId}/tailor-resume/pdf")
  public ResponseEntity<byte[]> tailorResumePdf(Authentication authentication, @PathVariable UUID jobId) {
    byte[] pdf = jobListingService.renderTailoredResumePdf(userId(authentication), jobId);
    return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF).body(pdf);
  }

  @GetMapping("/{jobId}/tailor-resume/versions")
  public ResponseEntity<ApiResponse<List<JobTailoringVersionResponse>>> tailoringVersions(
      Authentication authentication, @PathVariable UUID jobId) {
    List<JobTailoringVersionResponse> body =
        jobListingService.tailoringVersions(userId(authentication), jobId).stream()
            .map(JobTailoringVersionResponse::summary)
            .toList();
    return ResponseEntity.ok(ApiResponse.success(body, "Tailoring versions fetched"));
  }

  @GetMapping("/{jobId}/tailor-resume/versions/{versionId}/pdf")
  public ResponseEntity<byte[]> tailoringVersionPdf(
      Authentication authentication, @PathVariable UUID jobId, @PathVariable UUID versionId) {
    byte[] pdf = jobListingService.renderTailoringVersionPdf(userId(authentication), jobId, versionId);
    return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF).body(pdf);
  }

  @DeleteMapping("/{jobId}")
  public ResponseEntity<ApiResponse<Void>> delete(
      Authentication authentication, @PathVariable UUID jobId) {
    jobListingService.delete(userId(authentication), jobId);
    return ResponseEntity.ok(ApiResponse.success(null, "Job deleted"));
  }
}
