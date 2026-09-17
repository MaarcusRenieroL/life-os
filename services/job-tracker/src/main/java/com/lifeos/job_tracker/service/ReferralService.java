package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.dto.request.UpsertReferralRequest;
import com.lifeos.job_tracker.domains.entity.CareerProfile;
import com.lifeos.job_tracker.domains.entity.JobListing;
import com.lifeos.job_tracker.domains.entity.Referral;
import com.lifeos.job_tracker.domains.enums.ReferralStatus;
import com.lifeos.job_tracker.exception.InvalidRequestException;
import com.lifeos.job_tracker.exception.ResourceNotFoundException;
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
  private final CareerProfileService careerProfileService;

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
            .followUpAt(request.followUpAt())
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
    referral.setFollowUpAt(request.followUpAt());
    return referralRepository.save(referral);
  }

  /** Drafts (or re-drafts) the outreach message for this contact - a draft the candidate reviews
   * and sends themselves, never sent automatically. Moves a fresh referral from NOT_CONTACTED to
   * MESSAGE_DRAFTED so the pipeline reflects that there's something ready to send.
   *
   * <p>Deliberately not AI-generated: a referral ask is short, personal, and always says the same
   * thing - the candidate's own fixed template, filled in with this job's details, reads more
   * genuine than an LLM's approximation of it and never needs "confirm this doesn't sound weird"
   * review before sending. */
  @Transactional
  public Referral generateDraftMessage(UUID userId, UUID referralId) {
    Referral referral = get(userId, referralId);
    JobListing job = jobListingService.get(userId, referral.getJobId());
    String message = buildReferralMessage(userId, referral, job);
    referral.setDraftMessage(message);
    if (referral.getStatus() == ReferralStatus.NOT_CONTACTED) {
      referral.setStatus(ReferralStatus.MESSAGE_DRAFTED);
    }
    return referralRepository.save(referral);
  }

  private String buildReferralMessage(UUID userId, Referral referral, JobListing job) {
    String contactFirstName = firstWord(referral.getContactName());
    CareerProfile profile = careerProfileService.getProfileOrNull(userId);
    String signOff = firstWord(profile == null ? null : profile.getFullName());

    StringBuilder message = new StringBuilder();
    message.append("Hi").append(contactFirstName.isEmpty() ? "" : " " + contactFirstName).append(",\n\n");
    message.append("Hope you are doing good.\n");
    message
        .append("I found an opening at ")
        .append(job.getCompany())
        .append(" for the role ")
        .append(job.getTitle())
        .append(" and am very interested in applying for the same.\n\n");
    message.append("Could you please help me with a referral?\n");
    message.append("Job Id: ").append(job.getExternalId() == null ? "" : job.getExternalId()).append('\n');
    message.append("Job Link: ").append(job.getUrl() == null ? "" : job.getUrl()).append("\n\n");
    message.append("Regards,\n");
    message.append(signOff.isEmpty() ? "" : signOff);
    return message.toString();
  }

  private static String firstWord(String value) {
    if (value == null || value.isBlank()) {
      return "";
    }
    String trimmed = value.trim();
    int spaceIndex = trimmed.indexOf(' ');
    return spaceIndex < 0 ? trimmed : trimmed.substring(0, spaceIndex);
  }

  /** Every referral contact with a follow-up date set, across all jobs - feeds the dashboard's
   * "needs your attention" list. */
  @Transactional(readOnly = true)
  public List<Referral> upcomingFollowUps(UUID userId) {
    return referralRepository.findByUserIdAndFollowUpAtIsNotNull(userId);
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
