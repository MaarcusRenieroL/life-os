package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.dto.request.UpsertOfferRequest;
import com.lifeos.job_tracker.domains.entity.Application;
import com.lifeos.job_tracker.domains.entity.JobListing;
import com.lifeos.job_tracker.domains.entity.Offer;
import com.lifeos.job_tracker.domains.enums.ApplicationStatus;
import com.lifeos.job_tracker.domains.enums.StatusChangeActor;
import com.lifeos.job_tracker.exception.ResourceNotFoundException;
import com.lifeos.job_tracker.repository.ApplicationRepository;
import com.lifeos.job_tracker.repository.ApplicationStatusHistoryRepository;
import com.lifeos.job_tracker.repository.JobListingRepository;
import com.lifeos.job_tracker.repository.OfferRepository;
import com.lifeos.job_tracker.domains.entity.ApplicationStatusHistory;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class OfferService {

  private final OfferRepository offerRepository;
  private final ApplicationRepository applicationRepository;
  private final ApplicationStatusHistoryRepository historyRepository;
  private final JobListingRepository jobListingRepository;

  @Transactional(readOnly = true)
  public Offer get(UUID userId, UUID applicationId) {
    requireApplication(userId, applicationId);
    return offerRepository
        .findByApplicationId(applicationId)
        .orElseThrow(() -> ResourceNotFoundException.of("Offer for application", applicationId));
  }

  @Transactional
  public Offer upsert(UUID userId, UUID applicationId, UpsertOfferRequest request) {
    Application application = requireApplication(userId, applicationId);

    Offer offer =
        offerRepository
            .findByApplicationId(applicationId)
            .orElseGet(() -> Offer.builder().applicationId(applicationId).build());
    offer.setSalary(request.salary());
    offer.setCurrency(request.currency());
    offer.setBenefits(request.benefits());
    offer.setStartDate(request.startDate());
    offer.setNotes(request.notes());
    offer.setAccepted(request.accepted());
    offer = offerRepository.save(offer);

    if (application.getStatus() != ApplicationStatus.OFFER
        && !application.getStatus().isTerminal()) {
      ApplicationStatus previous = application.getStatus();
      application.setStatus(ApplicationStatus.OFFER);
      applicationRepository.save(application);
      historyRepository.save(
          ApplicationStatusHistory.builder()
              .applicationId(applicationId)
              .oldStatus(previous.value())
              .newStatus(ApplicationStatus.OFFER.value())
              .note("Offer recorded")
              .changedBy(StatusChangeActor.SYSTEM)
              .build());
    }
    return offer;
  }

  @Transactional
  public void delete(UUID userId, UUID applicationId) {
    requireApplication(userId, applicationId);
    offerRepository.findByApplicationId(applicationId).ifPresent(offerRepository::delete);
  }

  /** All offers side by side, ranked by a simple weighted score (salary + benefits count). */
  @Transactional(readOnly = true)
  public List<Map<String, Object>> compare(UUID userId) {
    List<Application> applications = applicationRepository.findAllByUserIdOrderByCreatedAtDesc(userId);
    Map<UUID, Application> byId = new LinkedHashMap<>();
    applications.forEach(a -> byId.put(a.getId(), a));
    List<Offer> offers = offerRepository.findAllByApplicationIdIn(byId.keySet());
    if (offers.isEmpty()) {
      return List.of();
    }

    BigDecimal maxSalary =
        offers.stream()
            .map(Offer::getSalary)
            .filter(s -> s != null)
            .max(Comparator.naturalOrder())
            .orElse(BigDecimal.ONE);

    List<Map<String, Object>> rows = new ArrayList<>();
    for (Offer offer : offers) {
      Application application = byId.get(offer.getApplicationId());
      JobListing job =
          application == null
              ? null
              : jobListingRepository.findById(application.getJobListingId()).orElse(null);

      double salaryScore =
          offer.getSalary() == null || maxSalary.signum() == 0
              ? 0
              : offer.getSalary().doubleValue() / maxSalary.doubleValue() * 70;
      double benefitScore = Math.min(20, (offer.getBenefits() == null ? 0 : offer.getBenefits().size()) * 5);
      double remoteScore = job != null && "REMOTE".equals(String.valueOf(job.getWorkModel())) ? 10 : 0;

      Map<String, Object> row = new LinkedHashMap<>();
      row.put("applicationId", offer.getApplicationId());
      row.put("company", job == null ? null : job.getCompany());
      row.put("title", job == null ? null : job.getTitle());
      row.put("salary", offer.getSalary());
      row.put("currency", offer.getCurrency());
      row.put("benefits", offer.getBenefits());
      row.put("startDate", offer.getStartDate());
      row.put("accepted", offer.getAccepted());
      row.put("score", Math.round((salaryScore + benefitScore + remoteScore) * 10) / 10.0);
      rows.add(row);
    }
    rows.sort(Comparator.comparingDouble(r -> -((Number) r.get("score")).doubleValue()));
    return rows;
  }

  private Application requireApplication(UUID userId, UUID applicationId) {
    return applicationRepository
        .findByIdAndUserId(applicationId, userId)
        .orElseThrow(() -> ResourceNotFoundException.of("Application", applicationId));
  }
}
