package com.lifeos.job_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.job_tracker.domains.dto.request.AddWatchedCompanyRequest;
import com.lifeos.job_tracker.domains.dto.request.DiscoveryPreferencesRequest;
import com.lifeos.job_tracker.domains.dto.request.UpdateWatchedCompanyRequest;
import com.lifeos.job_tracker.domains.dto.response.DiscoveredJobResponse;
import com.lifeos.job_tracker.domains.dto.response.DiscoveryPreferencesResponse;
import com.lifeos.job_tracker.domains.dto.response.DiscoveryScanResponse;
import com.lifeos.job_tracker.domains.dto.response.JobListingResponse;
import com.lifeos.job_tracker.domains.dto.response.WatchedCompanyResponse;
import com.lifeos.job_tracker.service.JobDiscoveryService;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Nested under {@code /v1/jobs} so the gateway and dev proxy, which already route that prefix to
 * this service, need no new rules.
 */
@RestController
@RequestMapping("/v1/jobs/discovery")
@RequiredArgsConstructor
public class JobDiscoveryController extends AuthenticatedController {

  private final JobDiscoveryService discoveryService;

  @GetMapping("/companies")
  public ResponseEntity<ApiResponse<List<WatchedCompanyResponse>>> companies(Authentication authentication) {
    return ResponseEntity.ok(
        ApiResponse.success(
            discoveryService.listCompanies(userId(authentication)).stream().map(WatchedCompanyResponse::from).toList(),
            "Watched companies fetched"));
  }

  @PostMapping("/companies")
  public ResponseEntity<ApiResponse<WatchedCompanyResponse>> addCompany(
      Authentication authentication, @Valid @RequestBody AddWatchedCompanyRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(
            ApiResponse.success(
                WatchedCompanyResponse.from(discoveryService.addCompany(userId(authentication), request)),
                "Company added to watchlist"));
  }

  @PatchMapping("/companies/{id}")
  public ResponseEntity<ApiResponse<WatchedCompanyResponse>> updateCompany(
      Authentication authentication, @PathVariable UUID id, @RequestBody UpdateWatchedCompanyRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            WatchedCompanyResponse.from(discoveryService.updateCompany(userId(authentication), id, request)),
            "Watched company updated"));
  }

  @DeleteMapping("/companies/{id}")
  public ResponseEntity<ApiResponse<Void>> deleteCompany(Authentication authentication, @PathVariable UUID id) {
    discoveryService.deleteCompany(userId(authentication), id);
    return ResponseEntity.ok(ApiResponse.success(null, "Company removed from watchlist"));
  }

  /** Scans one company now and waits for the result - used right after adding it. */
  @PostMapping("/companies/{id}/scan")
  public ResponseEntity<ApiResponse<DiscoveryScanResponse>> scanCompany(
      Authentication authentication, @PathVariable UUID id) {
    return ResponseEntity.ok(
        ApiResponse.success(discoveryService.scanCompany(userId(authentication), id), "Company scanned"));
  }

  /** Scans the whole watchlist in the background; poll {@code /companies} for progress. */
  @PostMapping("/scan")
  public ResponseEntity<ApiResponse<Boolean>> scanAll(Authentication authentication) {
    boolean started = discoveryService.scanInBackground(userId(authentication));
    return ResponseEntity.status(HttpStatus.ACCEPTED)
        .body(ApiResponse.success(started, started ? "Scan started" : "A scan is already running"));
  }

  @GetMapping("/jobs")
  public ResponseEntity<ApiResponse<List<DiscoveredJobResponse>>> inbox(
      Authentication authentication,
      @RequestParam(required = false) Integer minScore,
      @RequestParam(required = false) UUID companyId,
      @RequestParam(defaultValue = "200") int limit) {
    return ResponseEntity.ok(
        ApiResponse.success(
            discoveryService.inbox(userId(authentication), minScore, companyId, limit).stream()
                .map(job -> DiscoveredJobResponse.from(job, false))
                .toList(),
            "Discovered jobs fetched"));
  }

  @GetMapping("/jobs/{id}")
  public ResponseEntity<ApiResponse<DiscoveredJobResponse>> job(Authentication authentication, @PathVariable UUID id) {
    return ResponseEntity.ok(
        ApiResponse.success(
            DiscoveredJobResponse.from(discoveryService.getJob(userId(authentication), id), true),
            "Discovered job fetched"));
  }

  @PostMapping("/jobs/{id}/promote")
  public ResponseEntity<ApiResponse<JobListingResponse>> promote(Authentication authentication, @PathVariable UUID id) {
    return ResponseEntity.ok(
        ApiResponse.success(
            JobListingResponse.from(discoveryService.promote(userId(authentication), id)), "Added to your pipeline"));
  }

  @PostMapping("/jobs/{id}/dismiss")
  public ResponseEntity<ApiResponse<DiscoveredJobResponse>> dismiss(
      Authentication authentication, @PathVariable UUID id) {
    return ResponseEntity.ok(
        ApiResponse.success(
            DiscoveredJobResponse.from(discoveryService.dismiss(userId(authentication), id), false), "Dismissed"));
  }

  @GetMapping("/preferences")
  public ResponseEntity<ApiResponse<DiscoveryPreferencesResponse>> preferences(Authentication authentication) {
    return ResponseEntity.ok(
        ApiResponse.success(
            DiscoveryPreferencesResponse.from(discoveryService.getPreferences(userId(authentication))),
            "Preferences fetched"));
  }

  @PutMapping("/preferences")
  public ResponseEntity<ApiResponse<DiscoveryPreferencesResponse>> savePreferences(
      Authentication authentication, @RequestBody DiscoveryPreferencesRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            DiscoveryPreferencesResponse.from(discoveryService.savePreferences(userId(authentication), request)),
            "Preferences saved"));
  }
}
