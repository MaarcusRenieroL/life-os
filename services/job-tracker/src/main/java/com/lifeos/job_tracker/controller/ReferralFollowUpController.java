package com.lifeos.job_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.job_tracker.domains.dto.response.ReferralResponse;
import com.lifeos.job_tracker.service.ReferralService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Cross-job referral queries - separate from {@link ReferralController}, which is nested under
 * one job (/v1/jobs/{jobId}/referrals) and has no way to ask "across every job". */
@RestController
@RequestMapping("/v1/jobs/referrals")
@RequiredArgsConstructor
public class ReferralFollowUpController extends AuthenticatedController {

  private final ReferralService referralService;

  @GetMapping("/upcoming-follow-ups")
  public ResponseEntity<ApiResponse<List<ReferralResponse>>> upcomingFollowUps(Authentication authentication) {
    List<ReferralResponse> body =
        referralService.upcomingFollowUps(userId(authentication)).stream().map(ReferralResponse::from).toList();
    return ResponseEntity.ok(ApiResponse.success(body, "Upcoming referral follow-ups fetched"));
  }
}
