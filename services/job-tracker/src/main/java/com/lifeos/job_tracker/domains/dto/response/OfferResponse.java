package com.lifeos.job_tracker.domains.dto.response;

import com.lifeos.job_tracker.domains.entity.Offer;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record OfferResponse(
    UUID id,
    UUID applicationId,
    BigDecimal salary,
    String currency,
    List<String> benefits,
    LocalDate startDate,
    String notes,
    Boolean accepted) {

  public static OfferResponse from(Offer offer) {
    return new OfferResponse(
        offer.getId(),
        offer.getApplicationId(),
        offer.getSalary(),
        offer.getCurrency(),
        offer.getBenefits(),
        offer.getStartDate(),
        offer.getNotes(),
        offer.getAccepted());
  }
}
