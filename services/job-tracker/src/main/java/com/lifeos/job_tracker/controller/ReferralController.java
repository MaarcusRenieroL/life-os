package com.lifeos.job_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.job_tracker.domains.dto.request.UpsertReferralRequest;
import com.lifeos.job_tracker.domains.dto.response.ReferralResponse;
import com.lifeos.job_tracker.service.ReferralService;
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
@RequestMapping("/v1/jobs/{jobId}/referrals")
@RequiredArgsConstructor
public class ReferralController extends AuthenticatedController {

  private final ReferralService referralService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<ReferralResponse>>> list(
      Authentication authentication, @PathVariable UUID jobId) {
    List<ReferralResponse> body =
        referralService.list(userId(authentication), jobId).stream().map(ReferralResponse::from).toList();
    return ResponseEntity.ok(ApiResponse.success(body, "Referrals fetched"));
  }

  @PostMapping
  public ResponseEntity<ApiResponse<ReferralResponse>> create(
      Authentication authentication, @PathVariable UUID jobId, @RequestBody UpsertReferralRequest request) {
    ReferralResponse body =
        ReferralResponse.from(referralService.create(userId(authentication), jobId, request));
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(body, "Referral added"));
  }

  @PutMapping("/{referralId}")
  public ResponseEntity<ApiResponse<ReferralResponse>> update(
      Authentication authentication,
      @PathVariable UUID jobId,
      @PathVariable UUID referralId,
      @RequestBody UpsertReferralRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            ReferralResponse.from(referralService.update(userId(authentication), referralId, request)),
            "Referral updated"));
  }

  @PostMapping("/{referralId}/draft-message")
  public ResponseEntity<ApiResponse<ReferralResponse>> generateDraftMessage(
      Authentication authentication, @PathVariable UUID jobId, @PathVariable UUID referralId) {
    return ResponseEntity.ok(
        ApiResponse.success(
            ReferralResponse.from(referralService.generateDraftMessage(userId(authentication), referralId)),
            "Referral message drafted"));
  }

  @DeleteMapping("/{referralId}")
  public ResponseEntity<ApiResponse<Void>> delete(
      Authentication authentication, @PathVariable UUID jobId, @PathVariable UUID referralId) {
    referralService.delete(userId(authentication), referralId);
    return ResponseEntity.ok(ApiResponse.success(null, "Referral deleted"));
  }
}
