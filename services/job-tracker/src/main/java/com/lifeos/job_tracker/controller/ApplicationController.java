package com.lifeos.job_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.job_tracker.domains.dto.request.CreateApplicationRequest;
import com.lifeos.job_tracker.domains.dto.request.CreateInterviewPrepRequest;
import com.lifeos.job_tracker.domains.dto.request.CreateInterviewRoundRequest;
import com.lifeos.job_tracker.domains.dto.request.CreateReferralRequest;
import com.lifeos.job_tracker.domains.dto.request.UpdateApplicationRequest;
import com.lifeos.job_tracker.domains.dto.request.UpdateApplicationStatusRequest;
import com.lifeos.job_tracker.domains.dto.request.UpdateInterviewRoundRequest;
import com.lifeos.job_tracker.domains.dto.request.UpdateReferralRequest;
import com.lifeos.job_tracker.domains.dto.response.ApplicationDetailResponse;
import com.lifeos.job_tracker.domains.dto.response.ApplicationResponse;
import com.lifeos.job_tracker.domains.dto.response.InterviewPrepResponse;
import com.lifeos.job_tracker.domains.dto.response.InterviewRoundResponse;
import com.lifeos.job_tracker.domains.dto.response.OutreachAttemptResponse;
import com.lifeos.job_tracker.domains.dto.response.ReferralResponse;
import com.lifeos.job_tracker.domains.dto.response.ReferralSuggestionResponse;
import com.lifeos.job_tracker.domains.enums.ApplicationStatus;
import com.lifeos.job_tracker.service.ApplicationService;
import com.lifeos.job_tracker.service.ContactService;
import com.lifeos.job_tracker.service.InterviewPrepService;
import com.lifeos.job_tracker.service.InterviewService;
import com.lifeos.job_tracker.service.OutreachService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/applications")
@RequiredArgsConstructor
public class ApplicationController extends AuthenticatedController {

  private final ApplicationService applicationService;
  private final InterviewService interviewService;
  private final InterviewPrepService interviewPrepService;
  private final ContactService contactService;
  private final OutreachService outreachService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<ApplicationResponse>>> list(
      Authentication authentication, @RequestParam(required = false) String status) {
    ApplicationStatus parsed = status == null ? null : ApplicationStatus.fromValue(status);
    List<ApplicationResponse> body =
        applicationService.list(userId(authentication), parsed).stream()
            .map(ApplicationResponse::from)
            .toList();
    return ResponseEntity.ok(ApiResponse.success(body, "Applications fetched"));
  }

  @GetMapping("/needs-followup")
  public ResponseEntity<ApiResponse<List<ApplicationResponse>>> needsFollowUp(
      Authentication authentication) {
    List<ApplicationResponse> body =
        applicationService.needingFollowUp(userId(authentication)).stream()
            .map(ApplicationResponse::from)
            .toList();
    return ResponseEntity.ok(ApiResponse.success(body, "Stale applications fetched"));
  }

  @PostMapping
  public ResponseEntity<ApiResponse<ApplicationResponse>> create(
      Authentication authentication, @Valid @RequestBody CreateApplicationRequest request) {
    ApplicationResponse body =
        ApplicationResponse.from(applicationService.create(userId(authentication), request));
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(body, "Application created"));
  }

  @GetMapping("/{applicationId}")
  public ResponseEntity<ApiResponse<ApplicationDetailResponse>> detail(
      Authentication authentication, @PathVariable UUID applicationId) {
    return ResponseEntity.ok(
        ApiResponse.success(
            applicationService.detail(userId(authentication), applicationId), "Application fetched"));
  }

  @PatchMapping("/{applicationId}/status")
  public ResponseEntity<ApiResponse<ApplicationResponse>> updateStatus(
      Authentication authentication,
      @PathVariable UUID applicationId,
      @Valid @RequestBody UpdateApplicationStatusRequest request) {
    ApplicationResponse body =
        ApplicationResponse.from(
            applicationService.updateStatus(
                userId(authentication), applicationId, request.status(), request.note()));
    return ResponseEntity.ok(ApiResponse.success(body, "Status updated"));
  }

  @PatchMapping("/{applicationId}")
  public ResponseEntity<ApiResponse<ApplicationResponse>> update(
      Authentication authentication,
      @PathVariable UUID applicationId,
      @RequestBody UpdateApplicationRequest request) {
    ApplicationResponse body =
        ApplicationResponse.from(
            applicationService.update(userId(authentication), applicationId, request));
    return ResponseEntity.ok(ApiResponse.success(body, "Application updated"));
  }

  @DeleteMapping("/{applicationId}")
  public ResponseEntity<ApiResponse<Void>> delete(
      Authentication authentication, @PathVariable UUID applicationId) {
    applicationService.delete(userId(authentication), applicationId);
    return ResponseEntity.ok(ApiResponse.success(null, "Application deleted"));
  }

  // --- interview rounds -----------------------------------------------------

  @GetMapping("/{applicationId}/interviews")
  public ResponseEntity<ApiResponse<List<InterviewRoundResponse>>> interviews(
      Authentication authentication, @PathVariable UUID applicationId) {
    List<InterviewRoundResponse> body =
        interviewService.list(userId(authentication), applicationId).stream()
            .map(InterviewRoundResponse::from)
            .toList();
    return ResponseEntity.ok(ApiResponse.success(body, "Interview rounds fetched"));
  }

  @PostMapping("/{applicationId}/interviews")
  public ResponseEntity<ApiResponse<InterviewRoundResponse>> addInterview(
      Authentication authentication,
      @PathVariable UUID applicationId,
      @Valid @RequestBody CreateInterviewRoundRequest request) {
    InterviewRoundResponse body =
        InterviewRoundResponse.from(
            interviewService.create(userId(authentication), applicationId, request));
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(body, "Interview round added"));
  }

  @PatchMapping("/{applicationId}/interviews/{roundId}")
  public ResponseEntity<ApiResponse<InterviewRoundResponse>> updateInterview(
      Authentication authentication,
      @PathVariable UUID applicationId,
      @PathVariable UUID roundId,
      @RequestBody UpdateInterviewRoundRequest request) {
    InterviewRoundResponse body =
        InterviewRoundResponse.from(
            interviewService.update(userId(authentication), applicationId, roundId, request));
    return ResponseEntity.ok(ApiResponse.success(body, "Interview round updated"));
  }

  // --- referrals ----------------------------------------------------------

  @GetMapping("/{applicationId}/referral-suggestions")
  public ResponseEntity<ApiResponse<ReferralSuggestionResponse>> referralSuggestions(
      Authentication authentication, @PathVariable UUID applicationId) {
    return ResponseEntity.ok(
        ApiResponse.success(
            contactService.suggestReferrals(userId(authentication), applicationId),
            "Referral suggestions fetched"));
  }

  @PostMapping("/{applicationId}/referrals")
  public ResponseEntity<ApiResponse<ReferralResponse>> createReferral(
      Authentication authentication,
      @PathVariable UUID applicationId,
      @Valid @RequestBody CreateReferralRequest request) {
    ReferralResponse body =
        ReferralResponse.from(
            contactService.createReferral(userId(authentication), applicationId, request));
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(body, "Referral logged"));
  }

  @PatchMapping("/{applicationId}/referrals/{referralId}")
  public ResponseEntity<ApiResponse<ReferralResponse>> updateReferral(
      Authentication authentication,
      @PathVariable UUID applicationId,
      @PathVariable UUID referralId,
      @RequestBody UpdateReferralRequest request) {
    ReferralResponse body =
        ReferralResponse.from(
            contactService.updateReferral(userId(authentication), applicationId, referralId, request));
    return ResponseEntity.ok(ApiResponse.success(body, "Referral updated"));
  }

  // --- multi-channel outreach ------------------------------------------

  @GetMapping("/{applicationId}/outreach")
  public ResponseEntity<ApiResponse<List<OutreachAttemptResponse>>> outreach(
      Authentication authentication, @PathVariable UUID applicationId) {
    List<OutreachAttemptResponse> body =
        outreachService.list(userId(authentication), applicationId).stream()
            .map(OutreachAttemptResponse::from)
            .toList();
    return ResponseEntity.ok(ApiResponse.success(body, "Outreach fetched"));
  }

  @PostMapping("/{applicationId}/outreach/plan")
  public ResponseEntity<ApiResponse<List<OutreachAttemptResponse>>> planOutreach(
      Authentication authentication, @PathVariable UUID applicationId) {
    List<OutreachAttemptResponse> body =
        outreachService.planOutreach(userId(authentication), applicationId).stream()
            .map(OutreachAttemptResponse::from)
            .toList();
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(body, "Outreach planned"));
  }

  @PostMapping("/{applicationId}/outreach/{attemptId}/response")
  public ResponseEntity<ApiResponse<OutreachAttemptResponse>> markOutreachResponse(
      Authentication authentication,
      @PathVariable UUID applicationId,
      @PathVariable UUID attemptId,
      @RequestParam(required = false) Boolean opened,
      @RequestParam(required = false) Boolean clicked,
      @RequestParam(required = false) Boolean replied) {
    return ResponseEntity.ok(
        ApiResponse.success(
            OutreachAttemptResponse.from(
                outreachService.markResponse(userId(authentication), attemptId, opened, clicked, replied)),
            "Outreach updated"));
  }

  // --- interview prep checklist ---------------------------------------

  @GetMapping("/{applicationId}/interviews/{roundId}/prep")
  public ResponseEntity<ApiResponse<List<InterviewPrepResponse>>> prep(
      Authentication authentication, @PathVariable UUID applicationId, @PathVariable UUID roundId) {
    List<InterviewPrepResponse> body =
        interviewPrepService.list(userId(authentication), applicationId, roundId).stream()
            .map(InterviewPrepResponse::from)
            .toList();
    return ResponseEntity.ok(ApiResponse.success(body, "Prep checklist fetched"));
  }

  @PostMapping("/{applicationId}/interviews/{roundId}/prep")
  public ResponseEntity<ApiResponse<InterviewPrepResponse>> addPrep(
      Authentication authentication,
      @PathVariable UUID applicationId,
      @PathVariable UUID roundId,
      @Valid @RequestBody CreateInterviewPrepRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(
            ApiResponse.success(
                InterviewPrepResponse.from(
                    interviewPrepService.addItem(userId(authentication), applicationId, roundId, request)),
                "Prep item added"));
  }

  @PostMapping("/{applicationId}/interviews/{roundId}/prep/{prepId}/toggle")
  public ResponseEntity<ApiResponse<InterviewPrepResponse>> togglePrep(
      Authentication authentication,
      @PathVariable UUID applicationId,
      @PathVariable UUID roundId,
      @PathVariable UUID prepId) {
    return ResponseEntity.ok(
        ApiResponse.success(
            InterviewPrepResponse.from(
                interviewPrepService.toggle(userId(authentication), applicationId, roundId, prepId)),
            "Prep item toggled"));
  }
}
