package com.lifeos.job_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.common.events.AutomationEventPublisher;
import com.lifeos.common.events.AutomationEventRecord;
import com.lifeos.job_tracker.domains.dto.request.FromLinkRequest;
import com.lifeos.job_tracker.domains.dto.request.ImportAppliedJobsRequest;
import com.lifeos.job_tracker.domains.dto.request.PreviewAppliedJobsRequest;
import com.lifeos.job_tracker.domains.record.AppliedJobImport;
import com.lifeos.job_tracker.service.AppliedJobsImportService;
import com.lifeos.job_tracker.domains.dto.request.UpdateJobDetailsRequest;
import com.lifeos.job_tracker.domains.dto.request.UpdateJobListingRequest;
import com.lifeos.job_tracker.domains.dto.response.JobListingResponse;
import com.lifeos.job_tracker.domains.record.KnownPerson;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/v1/jobs")
@RequiredArgsConstructor
public class JobListingController extends AuthenticatedController {

  private final JobListingService jobListingService;
  private final AppliedJobsImportService appliedJobsImportService;
  private final AutomationEventPublisher automationEvents;

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
    publish(authentication, body, AutomationEventRecord.Kind.CREATED);
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(ApiResponse.success(body, "Job added from link"));
  }

  /**
   * Reads applications out of text pasted from a job board's "Applied jobs" page and returns them
   * for the candidate to confirm; nothing is saved here.
   */
  @PostMapping("/import/preview")
  public ResponseEntity<ApiResponse<java.util.List<AppliedJobImport.Candidate>>> previewImport(
      Authentication authentication, @RequestBody PreviewAppliedJobsRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(appliedJobsImportService.preview(userId(authentication), request.text()), "Applications read"));
  }

  /** Saves the confirmed rows as APPLIED jobs, skipping any already tracked. */
  @PostMapping("/import")
  public ResponseEntity<ApiResponse<AppliedJobImport.Result>> importApplied(
      Authentication authentication, @RequestBody ImportAppliedJobsRequest request) {
    AppliedJobImport.Result result =
        appliedJobsImportService.importJobs(userId(authentication), request.source(), request.items());
    return ResponseEntity.ok(ApiResponse.success(result, result.created() + " applications imported"));
  }

  /**
   * Attach a job posting link (or pasted description) to a job that already exists - typically one
   * created from a confirmation email, which only knew the company and title. Fills in the details
   * and re-scores. Returns 422 when the site blocked the read, like {@code /from-link}.
   */
  @PostMapping("/{jobId}/link")
  public ResponseEntity<ApiResponse<JobListingResponse>> attachLink(
      Authentication authentication, @PathVariable UUID jobId, @RequestBody FromLinkRequest request) {
    JobListingResponse updated =
        JobListingResponse.from(
            jobListingService.attachLink(userId(authentication), jobId, request.url(), request.jobDescriptionText()));
    publish(authentication, updated, AutomationEventRecord.Kind.UPDATED);
    return ResponseEntity.ok(ApiResponse.success(updated, "Job details filled in from the link"));
  }

  @PatchMapping("/{jobId}")
  public ResponseEntity<ApiResponse<JobListingResponse>> updateStatus(
      Authentication authentication,
      @PathVariable UUID jobId,
      @RequestBody UpdateJobListingRequest request) {
    JobListingResponse updated =
        JobListingResponse.from(jobListingService.updateStatus(userId(authentication), jobId, request.status()));
    publish(authentication, updated, AutomationEventRecord.Kind.UPDATED);
    return ResponseEntity.ok(ApiResponse.success(updated, "Status updated"));
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

  /** The standard referral ask for this job, ready to copy. {@code contactName} personalises the greeting. */
  @GetMapping("/{jobId}/referral-message")
  public ResponseEntity<ApiResponse<String>> referralMessage(
      Authentication authentication,
      @PathVariable UUID jobId,
      @RequestParam(required = false) String contactName) {
    return ResponseEntity.ok(
        ApiResponse.success(
            jobListingService.referralMessage(userId(authentication), jobId, contactName), "Referral message built"));
  }

  @GetMapping("/{jobId}/known-people")
  public ResponseEntity<ApiResponse<List<KnownPerson>>> knownPeople(
      Authentication authentication, @PathVariable UUID jobId) {
    return ResponseEntity.ok(
        ApiResponse.success(jobListingService.knownPeople(userId(authentication), jobId), "People fetched"));
  }

  @PutMapping("/{jobId}/known-people")
  public ResponseEntity<ApiResponse<List<KnownPerson>>> saveKnownPeople(
      Authentication authentication, @PathVariable UUID jobId, @RequestBody List<KnownPerson> people) {
    return ResponseEntity.ok(
        ApiResponse.success(
            jobListingService.saveKnownPeople(userId(authentication), jobId, people), "People saved"));
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

  /** Removes this job's override resume and recomputes the fit score against the skill library. */
  @DeleteMapping("/{jobId}/resume-override")
  public ResponseEntity<ApiResponse<JobListingResponse>> deleteResumeOverride(
      Authentication authentication, @PathVariable UUID jobId) {
    return ResponseEntity.ok(
        ApiResponse.success(
            JobListingResponse.from(jobListingService.deleteResumeOverride(userId(authentication), jobId)),
            "Resume override removed"));
  }

  /**
   * Scores the saved resume against this job and returns concrete wording-edit suggestions the
   * candidate applies to their own resume by hand - no resume is rewritten or generated here.
   */
  @PostMapping("/{jobId}/ats-suggestions")
  public ResponseEntity<ApiResponse<JobListingResponse>> getAtsSuggestions(
      Authentication authentication, @PathVariable UUID jobId) {
    return ResponseEntity.ok(
        ApiResponse.success(
            JobListingResponse.from(jobListingService.getAtsSuggestions(userId(authentication), jobId)),
            "ATS suggestions generated"));
  }

  @DeleteMapping("/{jobId}")
  public ResponseEntity<ApiResponse<Void>> delete(
      Authentication authentication, @PathVariable UUID jobId) {
    jobListingService.delete(userId(authentication), jobId);
    return ResponseEntity.ok(ApiResponse.success(null, "Job deleted"));
  }

  // Published from the controller so only the user's own changes trigger automation rules.
  private void publish(Authentication authentication, JobListingResponse job, AutomationEventRecord.Kind kind) {
    java.util.Map<String, String> attributes = new java.util.HashMap<>();
    if (job.status() != null) attributes.put("status", job.status());
    if (job.company() != null) attributes.put("company", job.company());
    String title = job.company() == null ? job.title() : job.title() + " at " + job.company();
    automationEvents.publish(userId(authentication), "JOB_APPLICATION", job.id(), kind, title, attributes);
  }
}
