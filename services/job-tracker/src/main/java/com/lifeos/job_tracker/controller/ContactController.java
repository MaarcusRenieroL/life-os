package com.lifeos.job_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.job_tracker.domains.dto.request.CreateContactRequest;
import com.lifeos.job_tracker.domains.dto.request.UpdateContactRequest;
import com.lifeos.job_tracker.domains.dto.response.ContactResponse;
import com.lifeos.job_tracker.service.ContactService;
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
@RequestMapping("/v1/contacts")
@RequiredArgsConstructor
public class ContactController extends AuthenticatedController {

  private final ContactService contactService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<ContactResponse>>> list(
      Authentication authentication, @RequestParam(required = false) UUID company) {
    List<ContactResponse> body =
        contactService.list(userId(authentication), company).stream().map(ContactResponse::from).toList();
    return ResponseEntity.ok(ApiResponse.success(body, "Contacts fetched"));
  }

  @GetMapping("/{contactId}")
  public ResponseEntity<ApiResponse<ContactResponse>> get(
      Authentication authentication, @PathVariable UUID contactId) {
    return ResponseEntity.ok(
        ApiResponse.success(
            ContactResponse.from(contactService.get(userId(authentication), contactId)), "Contact fetched"));
  }

  @PostMapping
  public ResponseEntity<ApiResponse<ContactResponse>> create(
      Authentication authentication, @Valid @RequestBody CreateContactRequest request) {
    ContactResponse body =
        ContactResponse.from(contactService.create(userId(authentication), request));
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(body, "Contact created"));
  }

  @PatchMapping("/{contactId}")
  public ResponseEntity<ApiResponse<ContactResponse>> update(
      Authentication authentication,
      @PathVariable UUID contactId,
      @RequestBody UpdateContactRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            ContactResponse.from(contactService.update(userId(authentication), contactId, request)),
            "Contact updated"));
  }

  @DeleteMapping("/{contactId}")
  public ResponseEntity<ApiResponse<Void>> delete(
      Authentication authentication, @PathVariable UUID contactId) {
    contactService.delete(userId(authentication), contactId);
    return ResponseEntity.ok(ApiResponse.success(null, "Contact deleted"));
  }
}
