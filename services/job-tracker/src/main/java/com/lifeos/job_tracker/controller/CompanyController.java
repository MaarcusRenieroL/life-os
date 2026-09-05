package com.lifeos.job_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.job_tracker.domains.dto.response.CompanyResponse;
import com.lifeos.job_tracker.domains.dto.response.ContactResponse;
import com.lifeos.job_tracker.service.ContactService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/companies")
@RequiredArgsConstructor
public class CompanyController extends AuthenticatedController {

  private final ContactService contactService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<CompanyResponse>>> list(Authentication authentication) {
    List<CompanyResponse> body =
        contactService.listCompanies(userId(authentication)).stream().map(CompanyResponse::from).toList();
    return ResponseEntity.ok(ApiResponse.success(body, "Companies fetched"));
  }

  @GetMapping("/{companyId}/contacts")
  public ResponseEntity<ApiResponse<List<ContactResponse>>> contacts(
      Authentication authentication, @PathVariable UUID companyId) {
    List<ContactResponse> body =
        contactService.list(userId(authentication), companyId).stream().map(ContactResponse::from).toList();
    return ResponseEntity.ok(ApiResponse.success(body, "Company contacts fetched"));
  }
}
