package com.lifeos.job_tracker.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.job_tracker.domains.dto.request.IngestEmailRequest;
import com.lifeos.job_tracker.domains.entity.Application;
import com.lifeos.job_tracker.domains.entity.ApplicationStatusHistory;
import com.lifeos.job_tracker.domains.entity.Company;
import com.lifeos.job_tracker.domains.entity.EmailMessage;
import com.lifeos.job_tracker.domains.entity.InterviewRound;
import com.lifeos.job_tracker.domains.entity.JobListing;
import com.lifeos.job_tracker.domains.enums.ApplicationStatus;
import com.lifeos.job_tracker.domains.enums.EmailCategory;
import com.lifeos.job_tracker.domains.enums.EmailDirection;
import com.lifeos.job_tracker.domains.enums.IngestSource;
import com.lifeos.job_tracker.domains.enums.InterviewStatus;
import com.lifeos.job_tracker.domains.enums.InterviewType;
import com.lifeos.job_tracker.domains.enums.ProcessingStatus;
import com.lifeos.job_tracker.domains.enums.StatusChangeActor;
import com.lifeos.job_tracker.domains.enums.VisaSponsorship;
import com.lifeos.job_tracker.domains.record.EmailClassification;
import com.lifeos.job_tracker.integration.AiAssistant;
import com.lifeos.job_tracker.kafka.JobEventProducer;
import com.lifeos.job_tracker.kafka.JobEventTopics;
import com.lifeos.job_tracker.repository.ApplicationRepository;
import com.lifeos.job_tracker.repository.ApplicationStatusHistoryRepository;
import com.lifeos.job_tracker.repository.CompanyRepository;
import com.lifeos.job_tracker.repository.EmailMessageRepository;
import com.lifeos.job_tracker.repository.InterviewRoundRepository;
import com.lifeos.job_tracker.repository.JobListingRepository;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Turns an inbound job-search email into the right domain change: create a job listing + application
 * from recruiter outreach, book an interview round from an invite, move to Rejected / Offer, or just
 * thread a confirmation.
 */
@Service
@RequiredArgsConstructor
public class EmailIngestionService {

  private static final Logger log = LoggerFactory.getLogger(EmailIngestionService.class);

  private final EmailMessageRepository emailMessageRepository;
  private final ApplicationRepository applicationRepository;
  private final ApplicationStatusHistoryRepository historyRepository;
  private final JobListingRepository jobListingRepository;
  private final CompanyRepository companyRepository;
  private final InterviewRoundRepository interviewRoundRepository;
  private final AiAssistant ai;
  private final JobEventProducer eventProducer;
  private final NotificationService notificationService;
  private final ObjectMapper objectMapper;

  @Transactional
  public EmailMessage ingest(IngestEmailRequest request) {
    Optional<EmailMessage> existing =
        emailMessageRepository.findByUserIdAndExternalMessageId(
            request.userId(), request.externalMessageId());
    if (existing.isPresent()) {
      return existing.get();
    }

    EmailClassification classification = classify(request);
    EmailCategory category = parseCategory(classification.category());
    UUID userId = request.userId();

    JobListing job = resolveOrCreateJob(userId, request, classification, category);
    Application application = resolveOrCreateApplication(userId, job, category);

    applyCategoryEffects(userId, category, application, classification);

    EmailMessage message =
        emailMessageRepository.save(
            EmailMessage.builder()
                .userId(userId)
                .applicationId(application == null ? null : application.getId())
                .direction(EmailDirection.INBOUND)
                .externalMessageId(request.externalMessageId())
                .threadId(request.threadId())
                .fromAddress(request.fromAddress())
                .toAddress(request.toAddress())
                .subject(request.subject())
                .body(request.body())
                .category(category)
                .receivedAt(request.receivedAt() == null ? Instant.now() : request.receivedAt())
                .parsedJson(objectMapper.convertValue(classification, new TypeReference<Map<String, Object>>() {}))
                .build());

    eventProducer.emit(
        JobEventTopics.EMAIL_PARSED,
        userId,
        payload(application, category, message.getId()));
    notificationService.push(
        userId,
        "EMAIL_" + category.name(),
        emailNotificationTitle(category, classification),
        request.subject(),
        application == null ? "EMAIL" : "APPLICATION",
        application == null ? message.getId() : application.getId());

    log.info("ingested email {} as {} (application {})", request.externalMessageId(), category,
        application == null ? "none" : application.getId());
    return message;
  }

  private EmailClassification classify(IngestEmailRequest request) {
    if (ai.available()) {
      try {
        return ai.classifyEmail(request.fromAddress(), request.subject(), request.body());
      } catch (RuntimeException exception) {
        log.warn("AI email classification failed, falling back to heuristics: {}", exception.getMessage());
      }
    }
    return heuristic(request);
  }

  private static EmailClassification heuristic(IngestEmailRequest request) {
    String haystack = (request.subject() + " " + request.body()).toLowerCase(Locale.ROOT);
    String category;
    if (haystack.contains("unfortunately")
        || haystack.contains("not moving forward")
        || haystack.contains("other candidates")
        || haystack.contains("decided not to proceed")) {
      category = "REJECTION";
    } else if (haystack.contains("offer") && haystack.contains("pleased")) {
      category = "OFFER";
    } else if (haystack.contains("interview")
        || haystack.contains("schedule a call")
        || haystack.contains("your availability")
        || haystack.contains("book a time")) {
      category = "INTERVIEW_INVITE";
    } else if (haystack.contains("received your application") || haystack.contains("thanks for applying")) {
      category = "CONFIRMATION";
    } else {
      category = "RECRUITER_OUTREACH";
    }
    return new EmailClassification(category, null, null, null, null, null, null, null);
  }

  private JobListing resolveOrCreateJob(
      UUID userId, IngestEmailRequest request, EmailClassification classification, EmailCategory category) {
    String companyName = classification.company() != null ? classification.company() : domainOf(request.fromAddress());
    if (companyName == null) {
      return matchExistingJob(userId, request, null).orElse(null);
    }

    Optional<JobListing> match = matchExistingJob(userId, request, companyName);
    if (match.isPresent()) {
      return match.get();
    }

    if (category != EmailCategory.RECRUITER_OUTREACH && category != EmailCategory.INTERVIEW_INVITE) {
      return null;
    }

    Company company =
        companyRepository
            .findByUserIdAndNameIgnoreCase(userId, companyName)
            .orElseGet(() -> companyRepository.save(Company.builder().userId(userId).name(companyName).build()));

    return jobListingRepository.save(
        JobListing.builder()
            .userId(userId)
            .companyId(company.getId())
            .title(classification.jobTitle() == null ? "Role at " + companyName : classification.jobTitle())
            .company(companyName)
            .url(classification.jobUrl())
            .source("email")
            .recruiterEmail(request.fromAddress())
            .visaSponsorship(VisaSponsorship.UNKNOWN)
            .parseStatus(ProcessingStatus.PENDING)
            .ingestedBy(IngestSource.EMAIL)
            .build());
  }

  private Optional<JobListing> matchExistingJob(
      UUID userId, IngestEmailRequest request, String companyName) {
    List<Application> applications = applicationRepository.findAllByUserIdOrderByCreatedAtDesc(userId);
    for (Application application : applications) {
      JobListing job = jobListingRepository.findById(application.getJobListingId()).orElse(null);
      if (job == null) {
        continue;
      }
      if (request.fromAddress() != null && request.fromAddress().equalsIgnoreCase(job.getRecruiterEmail())) {
        return Optional.of(job);
      }
      if (companyName != null && job.getCompany() != null
          && job.getCompany().toLowerCase(Locale.ROOT).contains(companyName.toLowerCase(Locale.ROOT))) {
        return Optional.of(job);
      }
    }
    return Optional.empty();
  }

  private Application resolveOrCreateApplication(UUID userId, JobListing job, EmailCategory category) {
    if (job == null) {
      return null;
    }
    Optional<Application> existing = applicationRepository.findByUserIdAndJobListingId(userId, job.getId());
    if (existing.isPresent()) {
      return existing.get();
    }
    if (category != EmailCategory.RECRUITER_OUTREACH && category != EmailCategory.INTERVIEW_INVITE) {
      return null;
    }
    Instant now = Instant.now();
    Application application =
        applicationRepository.save(
            Application.builder()
                .userId(userId)
                .jobListingId(job.getId())
                .status(ApplicationStatus.RECRUITER_CONTACTED)
                .applicationDate(now)
                .followUpReminderDate(now.plusSeconds(3 * 86400))
                .build());
    historyRepository.save(
        ApplicationStatusHistory.builder()
            .applicationId(application.getId())
            .newStatus(ApplicationStatus.RECRUITER_CONTACTED.value())
            .note("Created from inbound recruiter email")
            .changedBy(StatusChangeActor.SYSTEM)
            .build());
    return application;
  }

  private void applyCategoryEffects(
      UUID userId, EmailCategory category, Application application, EmailClassification classification) {
    if (application == null) {
      return;
    }
    switch (category) {
      case INTERVIEW_INVITE -> {
        interviewRoundRepository.save(
            InterviewRound.builder()
                .applicationId(application.getId())
                .type(InterviewType.RECRUITER_CALL)
                .scheduledDate(parseInstant(classification.interviewDate()))
                .meetingLink(classification.meetingLink())
                .actualStatus(InterviewStatus.SCHEDULED)
                .build());
        transition(application, ApplicationStatus.SCREENING, "Interview invite received by email");
        eventProducer.emit(
            JobEventTopics.INTERVIEW_SCHEDULED,
            userId,
            Map.of("applicationId", application.getId().toString()));
      }
      case REJECTION -> {
        application.setRejectionReason("Rejection email received");
        transition(application, ApplicationStatus.REJECTED, "Rejection email received");
      }
      case OFFER -> transition(application, ApplicationStatus.OFFER, "Offer email received");
      default -> {
        /* CONFIRMATION / RECRUITER_OUTREACH / OTHER: no status change */
      }
    }
  }

  private void transition(Application application, ApplicationStatus target, String note) {
    if (application.getStatus() == target || application.getStatus().isTerminal()) {
      return;
    }
    ApplicationStatus previous = application.getStatus();
    application.setStatus(target);
    applicationRepository.save(application);
    historyRepository.save(
        ApplicationStatusHistory.builder()
            .applicationId(application.getId())
            .oldStatus(previous.value())
            .newStatus(target.value())
            .note(note)
            .changedBy(StatusChangeActor.SYSTEM)
            .build());
  }

  private static Map<String, Object> payload(Application application, EmailCategory category, UUID messageId) {
    Map<String, Object> map = new HashMap<>();
    map.put("emailMessageId", messageId.toString());
    map.put("category", category.name());
    if (application != null) {
      map.put("applicationId", application.getId().toString());
    }
    return map;
  }

  private static String emailNotificationTitle(EmailCategory category, EmailClassification classification) {
    String company = classification.company() == null ? "" : " from " + classification.company();
    return switch (category) {
      case INTERVIEW_INVITE -> "Interview invite" + company;
      case REJECTION -> "Rejection" + company;
      case OFFER -> "Offer" + company;
      case RECRUITER_OUTREACH -> "Recruiter reached out" + company;
      case CONFIRMATION -> "Application confirmed" + company;
      case OTHER -> "New job-search email" + company;
    };
  }

  private static EmailCategory parseCategory(String raw) {
    try {
      return raw == null ? EmailCategory.OTHER : EmailCategory.valueOf(raw.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException exception) {
      return EmailCategory.OTHER;
    }
  }

  private static Instant parseInstant(String raw) {
    if (raw == null || raw.isBlank()) {
      return null;
    }
    try {
      return Instant.parse(raw.trim());
    } catch (RuntimeException exception) {
      return null;
    }
  }

  private static String domainOf(String email) {
    if (email == null || !email.contains("@")) {
      return null;
    }
    String host = email.substring(email.indexOf('@') + 1).toLowerCase(Locale.ROOT);
    host = host.replaceAll("\\.(com|io|co|net|org|ai|dev|app|xyz|example|test|invalid|localhost)(\\.[a-z]{2})?$", "");
    int dot = host.lastIndexOf('.');
    String label = dot >= 0 ? host.substring(dot + 1) : host;
    if (label.isBlank()
        || List.of("gmail", "outlook", "yahoo", "hotmail", "icloud", "proton", "example", "test")
            .contains(label)) {
      return null;
    }
    return Character.toUpperCase(label.charAt(0)) + label.substring(1);
  }
}
