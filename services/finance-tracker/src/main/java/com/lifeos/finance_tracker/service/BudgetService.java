package com.lifeos.finance_tracker.service;

import com.lifeos.finance_tracker.domains.dto.request.CreateBudgetRequest;
import com.lifeos.finance_tracker.domains.dto.request.UpdateBudgetRequest;
import com.lifeos.finance_tracker.domains.dto.response.BudgetResponse;
import com.lifeos.finance_tracker.domains.entity.Budget;
import com.lifeos.finance_tracker.exception.BudgetNotFoundException;
import com.lifeos.finance_tracker.repository.BudgetRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class BudgetService {

  private final BudgetRepository budgetRepository;

  public List<BudgetResponse> getAll(Authentication authentication) {
    UUID userId = (UUID) authentication.getPrincipal();

    return budgetRepository.findAllByUserId(userId).stream().map(this::toResponse).toList();
  }

  public BudgetResponse get(Authentication authentication, UUID id) {
    UUID userId = (UUID) authentication.getPrincipal();

    return toResponse(
        budgetRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> new BudgetNotFoundException(id)));
  }

  public BudgetResponse save(Authentication authentication, CreateBudgetRequest request) {
    UUID userId = (UUID) authentication.getPrincipal();

    Budget budget =
        Budget.builder()
            .userId(userId)
            .categoryId(request.getCategoryId())
            .budgetAmount(request.getBudgetAmount())
            .period(request.getPeriod())
            .startDate(request.getStartDate())
            .endDate(request.getEndDate())
            .alertThreshold(request.getAlertThreshold())
            .alertEnabled(request.isAlertEnabled())
            .notes(request.getNotes())
            .build();

    return toResponse(budgetRepository.save(budget));
  }

  public BudgetResponse update(Authentication authentication, UUID id, UpdateBudgetRequest request) {
    UUID userId = (UUID) authentication.getPrincipal();

    Budget budget =
        budgetRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> new BudgetNotFoundException(id));

    if (request.getCategoryId() != null) {
      budget.setCategoryId(request.getCategoryId());
    }

    if (request.getBudgetAmount() != null) {
      budget.setBudgetAmount(request.getBudgetAmount());
    }

    if (request.getPeriod() != null) {
      budget.setPeriod(request.getPeriod());
    }

    if (request.getStartDate() != null) {
      budget.setStartDate(request.getStartDate());
    }

    if (request.getEndDate() != null) {
      budget.setEndDate(request.getEndDate());
    }

    if (request.getAlertThreshold() != null) {
      budget.setAlertThreshold(request.getAlertThreshold());
    }

    if (request.getAlertEnabled() != null) {
      budget.setAlertEnabled(request.getAlertEnabled());
    }

    if (StringUtils.hasText(request.getNotes())) {
      budget.setNotes(request.getNotes());
    }

    return toResponse(budgetRepository.save(budget));
  }

  public void delete(Authentication authentication, UUID id) {
    UUID userId = (UUID) authentication.getPrincipal();

    budgetRepository
        .findByIdAndUserId(id, userId)
        .orElseThrow(() -> new BudgetNotFoundException(id));

    budgetRepository.deleteByIdAndUserId(id, userId);
  }

  private BudgetResponse toResponse(Budget budget) {
    return BudgetResponse.builder()
        .id(budget.getId())
        .categoryId(budget.getCategoryId())
        .budgetAmount(budget.getBudgetAmount())
        .period(budget.getPeriod())
        .startDate(budget.getStartDate())
        .endDate(budget.getEndDate())
        .alertThreshold(budget.getAlertThreshold())
        .alertEnabled(budget.isAlertEnabled())
        .notes(budget.getNotes())
        .createdAt(budget.getCreatedAt())
        .updatedAt(budget.getUpdatedAt())
        .build();
  }
}
