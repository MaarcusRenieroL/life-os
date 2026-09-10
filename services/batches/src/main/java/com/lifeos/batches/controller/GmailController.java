package com.lifeos.batches.controller;

import com.lifeos.batches.domains.record.GmailConnectionStatus;
import com.lifeos.batches.service.GmailOAuthService;
import com.lifeos.batches.service.GmailSyncService;
import com.lifeos.common.domains.dto.response.ApiResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
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

  private final GmailOAuthService gmailOAuthService;
  private final GmailSyncService gmailSyncService;

  @GetMapping("/status")
  public ResponseEntity<ApiResponse<GmailConnectionStatus>> status() {
    return ResponseEntity.ok(
        ApiResponse.success(gmailOAuthService.getStatus(), "Gmail status fetched successfully"));
  }

  // Visit this in a browser (not an API call) - it redirects to Google's
  // consent screen. One-time setup step, or re-run to reconnect.
  @GetMapping("/connect")
  public ResponseEntity<Void> connect() {
    return ResponseEntity.status(HttpStatus.FOUND)
        .header(HttpHeaders.LOCATION, gmailOAuthService.buildAuthorizationUrl())
        .build();
  }

  @GetMapping("/callback")
  public ResponseEntity<ApiResponse<Void>> callback(@RequestParam("code") String code)
      throws IOException {
    gmailOAuthService.handleCallback(code);

    return ResponseEntity.ok(ApiResponse.success(null, "Gmail account connected successfully"));
  }

  // Full historical sync, triggered manually - the scheduled poll only ever
  // looks at the last 2 days, so this is the only way to pull in alert
  // emails from further back than that.
  @PostMapping("/sync-all")
  public ResponseEntity<ApiResponse<Integer>> syncAll() throws IOException {
    int processed = gmailSyncService.syncAll();

    return ResponseEntity.ok(ApiResponse.success(processed, processed + " transactions synced"));
  }
}
