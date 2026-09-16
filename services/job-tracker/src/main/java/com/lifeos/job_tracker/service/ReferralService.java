package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.dto.request.UpsertReferralRequest;
import com.lifeos.job_tracker.domains.entity.JobListing;
import com.lifeos.job_tracker.domains.entity.Referral;
import com.lifeos.job_tracker.domains.entity.Resume;
import com.lifeos.job_tracker.domains.enums.ReferralStatus;
import com.lifeos.job_tracker.exception.InvalidRequestException;
import com.lifeos.job_tracker.exception.ResourceNotFoundException;
import com.lifeos.job_tracker.integration.AiAssistant;
import com.lifeos.job_tracker.repository.ReferralRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ReferralService {

  private final ReferralRepository referralRepository;
  private final JobListingService jobListingService;
  private final ResumeService resumeService;
  private final AiAssistant ai;

  @Transactional(readOnly = true)
  public List<Referral> list(UUID userId, UUID jobId) {
    jobListingService.get(userId, jobId); // 404s if the job isn't the caller's
    return referralRepository.findByJobIdAndUserIdOrderByCreatedAtDesc(jobId, userId);
  }

  @Transactional(readOnly = true)
  public Referral get(UUID userId, UUID referralId) {
    return referralRepository
        .findByIdAndUserId(referralId, userId)
        .orElseThrow(() -> ResourceNotFoundException.of("Referral", referralId));
  }

  @Transactional
  public Referral create(UUID userId, UUID jobId, UpsertReferralRequest request) {
    JobListing job = jobListingService.get(userId, jobId);
    if (request.contactName() == null || request.contactName().isBlank()) {
      throw new InvalidRequestException("contactName is required");
    }
    Referral referral =
        Referral.builder()
            .jobId(job.getId())
            .userId(userId)
            .contactName(request.contactName().trim())
            .contactTitle(request.contactTitle())
            .contactLinkedinUrl(request.contactLinkedinUrl())
            .contactEmail(request.contactEmail())
            .relationship(request.relationship())
            .status(parseStatus(request.status()))
            .notes(request.notes())
            .contactedAt(request.contactedAt())
            .build();
    return referralRepository.save(referral);
  }

  @Transactional
  public Referral update(UUID userId, UUID referralId, UpsertReferralRequest request) {
    Referral referral = get(userId, referralId);
    if (request.contactName() == null || request.contactName().isBlank()) {
      throw new InvalidRequestException("contactName is required");
    }
    referral.setContactName(request.contactName().trim());
    referral.setContactTitle(request.contactTitle());
    referral.setContactLinkedinUrl(request.contactLinkedinUrl());
    referral.setContactEmail(request.contactEmail());
    referral.setRelationship(request.relationship());
    referral.setStatus(parseStatus(request.status()));
    referral.setNotes(request.notes());
    referral.setContactedAt(request.contactedAt());
    return referralRepository.save(referral);
  }

  /** Drafts (or re-drafts) the outreach message for this contact - a draft the candidate reviews
   * and sends themselves, never sent automatically. Moves a fresh referral from NOT_CONTACTED to
   * MESSAGE_DRAFTED so the pipeline reflects that there's something ready to send. */
  @Transactional
  public Referral generateDraftMessage(UUID userId, UUID referralId) {
    Referral referral = get(userId, referralId);
    JobListing job = jobListingService.get(userId, referral.getJobId());
    if (!ai.available()) {
      throw new InvalidRequestException(
          "Drafting a referral message needs an AI provider; set ANTHROPIC_API_KEY or enable Ollama");
    }
    Resume resume = resumeService.getCurrent(userId);
    if (resume.getRawText() == null || resume.getRawText().isBlank()) {
      throw new InvalidRequestException("Upload a resume with readable text before drafting a referral message");
    }

    String message =
        ai.generateReferralMessage(
            referral.getContactName(),
            referral.getContactTitle(),
            referral.getRelationship(),
            job.getTitle(),
            job.getCompany(),
            resume.getRawText());
    referral.setDraftMessage(message);
    if (referral.getStatus() == ReferralStatus.NOT_CONTACTED) {
      referral.setStatus(ReferralStatus.MESSAGE_DRAFTED);
    }
    return referralRepository.save(referral);
  }

  @Transactional
  public void delete(UUID userId, UUID referralId) {
    referralRepository.delete(get(userId, referralId));
  }

  private static ReferralStatus parseStatus(String raw) {
    if (raw == null || raw.isBlank()) {
      return ReferralStatus.NOT_CONTACTED;
    }
    try {
      return ReferralStatus.valueOf(raw.trim().toUpperCase());
    } catch (IllegalArgumentException exception) {
      throw new InvalidRequestException("Unknown referral status: " + raw);
    }
  }
}
