package com.lifeos.batches.controller;

import com.lifeos.batches.domains.enums.GmailPurpose;
import com.lifeos.batches.domains.record.GmailConnectionStatus;
import com.lifeos.batches.service.EmailHubSyncService;
import com.lifeos.batches.service.GmailOAuthService;
import com.lifeos.batches.service.GmailSyncService;
import com.lifeos.batches.service.JobEmailSyncService;
import com.lifeos.common.domains.dto.response.ApiResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/batches/gmail")
@RequiredArgsConstructor
public class GmailController {

  @Value("${gmail.post-connect-url}")
  private String postConnectUrl;

  private final GmailOAuthService gmailOAuthService;
  private final GmailSyncService gmailSyncService;
  private final JobEmailSyncService jobEmailSyncService;
  private final EmailHubSyncService emailHubSyncService;

  @GetMapping("/status")
  public ResponseEntity<ApiResponse<GmailConnectionStatus>> status() {
    return ResponseEntity.ok(
        ApiResponse.success(gmailOAuthService.getStatus(), "Gmail status fetched successfully"));
  }

  /**
   * Starts a Gmail connection: returns the Google consent URL for the signed-in user to open. It needs a
   * login because the URL carries a one-time state that the callback later requires.
   */
  @GetMapping("/connect-url")
  public ResponseEntity<ApiResponse<String>> connectUrl(
      @RequestParam(value = "purpose", defaultValue = "FINANCE") GmailPurpose purpose) {
    return ResponseEntity.ok(ApiResponse.success(gmailOAuthService.buildAuthorizationUrl(purpose), "Open this link to connect Gmail"));
  }

  @GetMapping("/callback")
  public ResponseEntity<Void> callback(
      @RequestParam("code") String code, @RequestParam(value = "state", required = false) String state)
      throws IOException {
    gmailOAuthService.handleCallback(code, state);

    // The browser is mid-navigation from Google, so send it back to the app rather than showing JSON.
    return ResponseEntity.status(HttpStatus.FOUND).header(HttpHeaders.LOCATION, postConnectUrl).build();
  }

  // Full historical sync, triggered manually - the scheduled poll only ever
  // looks at the last 2 days, so this is the only way to pull in alert
  // emails from further back than that.
  @PostMapping("/sync-all")
  public ResponseEntity<ApiResponse<Integer>> syncAll() throws IOException {
    int processed = gmailSyncService.syncAll();

    return ResponseEntity.ok(ApiResponse.success(processed, processed + " transactions synced"));
  }

  // The last week of job emails, on demand - what the "Check email" button in the job tracker calls,
  // so a fresh application confirmation doesn't wait for the next scheduled poll.
  @PostMapping("/jobs/sync-recent")
  public ResponseEntity<ApiResponse<Integer>> syncRecentJobEmails() throws IOException {
    int processed = jobEmailSyncService.syncRecent();

    return ResponseEntity.ok(ApiResponse.success(processed, processed + " job emails queued"));
  }

  // The last three days of inbox mail, on demand - what the email inbox's "Check now" button calls.
  @PostMapping("/hub/sync-recent")
  public ResponseEntity<ApiResponse<Integer>> syncRecentHub() throws IOException {
    int queued = emailHubSyncService.syncRecent();

    return ResponseEntity.ok(ApiResponse.success(queued, queued + " emails queued"));
  }

  // Same idea as /sync-all above, for the job-tracking email pipeline instead of bank alerts.
  @PostMapping("/jobs/sync-all")
  public ResponseEntity<ApiResponse<Integer>> syncAllJobEmails() throws IOException {
    int processed = jobEmailSyncService.syncAll();

    return ResponseEntity.ok(ApiResponse.success(processed, processed + " job emails synced"));
  }
}
