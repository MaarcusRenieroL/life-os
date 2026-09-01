package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.dto.request.CreateContactRequest;
import com.lifeos.job_tracker.domains.dto.request.CreateReferralRequest;
import com.lifeos.job_tracker.domains.dto.request.UpdateContactRequest;
import com.lifeos.job_tracker.domains.dto.request.UpdateReferralRequest;
import com.lifeos.job_tracker.domains.dto.response.ContactResponse;
import com.lifeos.job_tracker.domains.dto.response.ReferralSuggestionResponse;
import com.lifeos.job_tracker.domains.entity.Application;
import com.lifeos.job_tracker.domains.entity.Company;
import com.lifeos.job_tracker.domains.entity.Contact;
import com.lifeos.job_tracker.domains.entity.JobListing;
import com.lifeos.job_tracker.domains.entity.Referral;
import com.lifeos.job_tracker.domains.enums.ReferralStatus;
import com.lifeos.job_tracker.domains.enums.RelationshipType;
import com.lifeos.job_tracker.exception.ResourceNotFoundException;
import com.lifeos.job_tracker.integration.AiAssistant;
import com.lifeos.job_tracker.kafka.JobEventProducer;
import com.lifeos.job_tracker.kafka.JobEventTopics;
import com.lifeos.job_tracker.repository.ApplicationRepository;
import com.lifeos.job_tracker.repository.CompanyRepository;
import com.lifeos.job_tracker.repository.ContactRepository;
import com.lifeos.job_tracker.repository.JobListingRepository;
import com.lifeos.job_tracker.repository.ReferralRepository;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ContactService {

  private final ContactRepository contactRepository;
  private final CompanyRepository companyRepository;
  private final ApplicationRepository applicationRepository;
  private final JobListingRepository jobListingRepository;
  private final ReferralRepository referralRepository;
  private final AiAssistant ai;
  private final JobEventProducer eventProducer;

  @Transactional(readOnly = true)
  public List<Company> listCompanies(UUID userId) {
    return companyRepository.findAllByUserIdOrderByNameAsc(userId);
  }

  @Transactional(readOnly = true)
  public List<Contact> list(UUID userId, UUID companyId) {
    return companyId == null
        ? contactRepository.findAllByUserIdOrderByNameAsc(userId)
        : contactRepository.findAllByUserIdAndCompanyIdOrderByNameAsc(userId, companyId);
  }

  @Transactional(readOnly = true)
  public Contact get(UUID userId, UUID contactId) {
    return contactRepository
        .findByIdAndUserId(contactId, userId)
        .orElseThrow(() -> ResourceNotFoundException.of("Contact", contactId));
  }

  @Transactional
  public Contact create(UUID userId, CreateContactRequest request) {
    UUID companyId = request.companyId();
    if (companyId == null && request.companyName() != null && !request.companyName().isBlank()) {
      companyId =
          companyRepository
              .findByUserIdAndNameIgnoreCase(userId, request.companyName().trim())
              .orElseGet(
                  () ->
                      companyRepository.save(
                          Company.builder().userId(userId).name(request.companyName().trim()).build()))
              .getId();
    }

    return contactRepository.save(
        Contact.builder()
            .userId(userId)
            .companyId(companyId)
            .name(request.name())
            .role(request.role())
            .email(request.email())
            .phone(request.phone())
            .linkedinUrl(request.linkedinUrl())
            .relationshipType(
                request.relationshipType() == null ? RelationshipType.OTHER : request.relationshipType())
            .vip(Boolean.TRUE.equals(request.vip()))
            .notes(request.notes())
            .build());
  }

  @Transactional
  public Contact update(UUID userId, UUID contactId, UpdateContactRequest request) {
    Contact contact = get(userId, contactId);
    if (request.name() != null) {
      contact.setName(request.name());
    }
    if (request.role() != null) {
      contact.setRole(request.role());
    }
    if (request.email() != null) {
      contact.setEmail(request.email());
    }
    if (request.phone() != null) {
      contact.setPhone(request.phone());
    }
    if (request.linkedinUrl() != null) {
      contact.setLinkedinUrl(request.linkedinUrl());
    }
    if (request.relationshipType() != null) {
      contact.setRelationshipType(request.relationshipType());
    }
    if (request.vip() != null) {
      contact.setVip(request.vip());
    }
    if (request.lastInteractionDate() != null) {
      contact.setLastInteractionDate(request.lastInteractionDate());
    }
    if (request.notes() != null) {
      contact.setNotes(request.notes());
    }
    return contactRepository.save(contact);
  }

  @Transactional
  public void delete(UUID userId, UUID contactId) {
    contactRepository.delete(get(userId, contactId));
  }

  @Transactional(readOnly = true)
  public ReferralSuggestionResponse suggestReferrals(UUID userId, UUID applicationId) {
    Application application =
        applicationRepository
            .findByIdAndUserId(applicationId, userId)
            .orElseThrow(() -> ResourceNotFoundException.of("Application", applicationId));
    JobListing job =
        jobListingRepository
            .findByIdAndUserId(application.getJobListingId(), userId)
            .orElseThrow(() -> ResourceNotFoundException.of("Job listing", application.getJobListingId()));

    List<Contact> contacts =
        job.getCompanyId() == null
            ? List.of()
            : contactRepository.findAllByUserIdAndCompanyIdOrderByNameAsc(userId, job.getCompanyId());

    String draft = null;
    if (!contacts.isEmpty() && ai.available()) {
      draft =
          ai.generateReferralMessage(
              contacts.get(0).getName(),
              job.getTitle(),
              job.getCompany(),
              job.getRequiredSkills() == null ? List.of() : job.getRequiredSkills());
    }

    return new ReferralSuggestionResponse(
        job.getCompany(), contacts.stream().map(ContactResponse::from).toList(), draft);
  }

  @Transactional
  public Referral createReferral(UUID userId, UUID applicationId, CreateReferralRequest request) {
    Application application =
        applicationRepository
            .findByIdAndUserId(applicationId, userId)
            .orElseThrow(() -> ResourceNotFoundException.of("Application", applicationId));
    Contact contact = get(userId, request.contactId());

    String message = request.messageSent();
    if ((message == null || message.isBlank()) && Boolean.TRUE.equals(request.generateMessage()) && ai.available()) {
      JobListing job = jobListingRepository.findByIdAndUserId(application.getJobListingId(), userId).orElseThrow();
      message =
          ai.generateReferralMessage(
              contact.getName(),
              job.getTitle(),
              job.getCompany(),
              job.getRequiredSkills() == null ? List.of() : job.getRequiredSkills());
    }

    Referral referral =
        referralRepository
            .findByApplicationIdAndContactId(applicationId, contact.getId())
            .orElseGet(
                () ->
                    Referral.builder()
                        .applicationId(applicationId)
                        .contactId(contact.getId())
                        .referralStatus(ReferralStatus.PENDING)
                        .build());
    referral.setMessageSent(message);
    referral.setOutreachDate(Instant.now());
    referral.setReferralStatus(ReferralStatus.CONTACTED);
    referral = referralRepository.save(referral);

    contact.setLastInteractionDate(Instant.now());
    contactRepository.save(contact);

    eventProducer.emit(
        JobEventTopics.REFERRAL_INITIATED,
        userId,
        Map.of(
            "applicationId", applicationId.toString(),
            "contactId", contact.getId().toString(),
            "referralId", referral.getId().toString()));

    return referral;
  }

  @Transactional
  public Referral updateReferral(UUID userId, UUID applicationId, UUID referralId, UpdateReferralRequest request) {
    applicationRepository
        .findByIdAndUserId(applicationId, userId)
        .orElseThrow(() -> ResourceNotFoundException.of("Application", applicationId));
    Referral referral =
        referralRepository
            .findById(referralId)
            .filter(r -> r.getApplicationId().equals(applicationId))
            .orElseThrow(() -> ResourceNotFoundException.of("Referral", referralId));

    if (request.referralStatus() != null) {
      referral.setReferralStatus(request.referralStatus());
    }
    if (request.responseReceived() != null) {
      referral.setResponseReceived(request.responseReceived());
    }
    if (request.responseDate() != null) {
      referral.setResponseDate(request.responseDate());
    }
    if (request.followUpDate() != null) {
      referral.setFollowUpDate(request.followUpDate());
    }
    if (request.notes() != null) {
      referral.setNotes(request.notes());
    }
    return referralRepository.save(referral);
  }
}
