package com.lifeos.finance_tracker.service;

import com.lifeos.finance_tracker.domains.dto.request.UpdateRecurringPatternRequest;
import com.lifeos.finance_tracker.domains.dto.response.RecurringPatternResponse;
import com.lifeos.finance_tracker.domains.entity.RecurringPattern;
import com.lifeos.finance_tracker.exception.RecurringPatternNotFoundException;
import com.lifeos.finance_tracker.repository.RecurringPatternRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class RecurringPatternService {

  private final RecurringPatternRepository recurringPatternRepository;

  public List<RecurringPatternResponse> getAll(Authentication authentication) {
    UUID userId = (UUID) authentication.getPrincipal();

    return recurringPatternRepository.findAllByUserId(userId).stream()
        .map(this::toResponse)
        .toList();
  }

  public RecurringPatternResponse get(Authentication authentication, UUID id) {
    UUID userId = (UUID) authentication.getPrincipal();

    return toResponse(
        recurringPatternRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> new RecurringPatternNotFoundException(id)));
  }

  public RecurringPatternResponse update(
      Authentication authentication, UUID id, UpdateRecurringPatternRequest request) {
    UUID userId = (UUID) authentication.getPrincipal();

    RecurringPattern pattern =
        recurringPatternRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> new RecurringPatternNotFoundException(id));

    if (request.getCategoryId() != null) {
      pattern.setCategoryId(request.getCategoryId());
    }

    return toResponse(recurringPatternRepository.save(pattern));
  }

  public void delete(Authentication authentication, UUID id) {
    UUID userId = (UUID) authentication.getPrincipal();

    recurringPatternRepository
        .findByIdAndUserId(id, userId)
        .orElseThrow(() -> new RecurringPatternNotFoundException(id));

    recurringPatternRepository.deleteByIdAndUserId(id, userId);
  }

  private RecurringPatternResponse toResponse(RecurringPattern pattern) {
    return RecurringPatternResponse.builder()
        .id(pattern.getId())
        .merchantId(pattern.getMerchantId())
        .categoryId(pattern.getCategoryId())
        .averageAmount(pattern.getAverageAmount())
        .frequency(pattern.getFrequency())
        .expectedDayOfCycle(pattern.getExpectedDayOfCycle())
        .lastTransactionDate(pattern.getLastTransactionDate())
        .nextExpectedDate(pattern.getNextExpectedDate())
        .variance(pattern.getVariance())
        .confidenceScore(pattern.getConfidenceScore())
        .lastDetectedAt(pattern.getLastDetectedAt())
        .createdAt(pattern.getCreatedAt())
        .build();
  }
}
