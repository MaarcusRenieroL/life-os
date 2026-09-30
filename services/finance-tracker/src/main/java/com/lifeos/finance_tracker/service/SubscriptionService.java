package com.lifeos.finance_tracker.service;

import com.lifeos.finance_tracker.domains.dto.request.SaveSubscriptionRequest;
import com.lifeos.finance_tracker.domains.dto.response.SubscriptionChargeResponse;
import com.lifeos.finance_tracker.domains.dto.response.SubscriptionResponse;
import com.lifeos.finance_tracker.domains.dto.response.SubscriptionSummaryResponse;
import com.lifeos.finance_tracker.domains.entity.Account;
import com.lifeos.finance_tracker.domains.entity.Merchant;
import com.lifeos.finance_tracker.domains.entity.RecurringPattern;
import com.lifeos.finance_tracker.domains.entity.Subscription;
import com.lifeos.finance_tracker.domains.enums.BillingCycle;
import com.lifeos.finance_tracker.domains.enums.RecurringFrequency;
import com.lifeos.finance_tracker.domains.enums.SubscriptionStatus;
import com.lifeos.finance_tracker.exception.AccountNotFoundException;
import com.lifeos.finance_tracker.exception.CategoryNotFoundException;
import com.lifeos.finance_tracker.exception.InvalidRequestException;
import com.lifeos.finance_tracker.exception.RecurringPatternNotFoundException;
import com.lifeos.finance_tracker.exception.SubscriptionNotFoundException;
import com.lifeos.finance_tracker.repository.AccountRepository;
import com.lifeos.finance_tracker.repository.CategoryRepository;
import com.lifeos.finance_tracker.repository.MerchantRepository;
import com.lifeos.finance_tracker.repository.RecurringPatternRepository;
import com.lifeos.finance_tracker.repository.SubscriptionRepository;
import com.lifeos.finance_tracker.repository.TransactionRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** CRUD and lifecycle for user-declared subscriptions. The scheduled billing/reminder work lives
 * in SubscriptionBillingService; this is everything a user does by hand. */
@Service
@RequiredArgsConstructor
@Transactional
public class SubscriptionService {

  static final int RENEWING_SOON_DAYS = 7;

  private final SubscriptionRepository subscriptionRepository;
  private final SubscriptionBillingService billingService;
  private final AccountRepository accountRepository;
  private final CategoryRepository categoryRepository;
  private final MerchantRepository merchantRepository;
  private final RecurringPatternRepository recurringPatternRepository;
  private final TransactionRepository transactionRepository;

  // A monthly-equivalent price at or above this counts as "high cost" for the unused-subscription
  // flag. The app is INR-denominated throughout, so this is rupees.
  @Value("${finance.subscriptions.high-cost-monthly:500}")
  private BigDecimal highCostMonthly = BigDecimal.valueOf(500);

  @Transactional(readOnly = true)
  public List<SubscriptionResponse> list(UUID userId, SubscriptionStatus status) {
    LocalDate today = SubscriptionBillingService.today();
    return subscriptionRepository.findAllByUserIdOrderByNextBillingDateAsc(userId).stream()
        .filter(s -> status == null || s.getStatus() == status)
        .map(s -> toResponse(s, today))
        .toList();
  }

  @Transactional(readOnly = true)
  public SubscriptionResponse get(UUID userId, UUID id) {
    return toResponse(findOwned(userId, id), SubscriptionBillingService.today());
  }

  @Transactional(readOnly = true)
  public SubscriptionSummaryResponse summary(UUID userId) {
    LocalDate today = SubscriptionBillingService.today();
    List<SubscriptionResponse> active = list(userId, SubscriptionStatus.ACTIVE);

    BigDecimal monthly = active.stream().map(SubscriptionResponse::monthlyCost).reduce(BigDecimal.ZERO, BigDecimal::add);
    BigDecimal yearly = active.stream().map(SubscriptionResponse::yearlyCost).reduce(BigDecimal.ZERO, BigDecimal::add);
    List<SubscriptionResponse> wasteful = active.stream().filter(SubscriptionResponse::wasteful).toList();
    List<SubscriptionResponse> renewingSoon =
        active.stream().filter(s -> s.daysUntilRenewal() != null && s.daysUntilRenewal() >= 0 && s.daysUntilRenewal() <= RENEWING_SOON_DAYS).toList();

    return new SubscriptionSummaryResponse(
        active.size(),
        monthly,
        yearly,
        wasteful.size(),
        wasteful.stream().map(SubscriptionResponse::monthlyCost).reduce(BigDecimal.ZERO, BigDecimal::add),
        renewingSoon.size(),
        renewingSoon.stream().map(SubscriptionResponse::amount).reduce(BigDecimal.ZERO, BigDecimal::add));
  }

  public SubscriptionResponse create(UUID userId, SaveSubscriptionRequest request) {
    LocalDate today = SubscriptionBillingService.today();
    if (request.nextBillingDate().isBefore(today)) {
      throw new InvalidRequestException("The next billing date can't be in the past");
    }
    Subscription subscription = Subscription.builder().userId(userId).build();
    subscription.setBillingAnchorDay(request.nextBillingDate().getDayOfMonth());
    apply(userId, subscription, request);
    return toResponse(subscriptionRepository.save(subscription), today);
  }

  public SubscriptionResponse update(UUID userId, UUID id, SaveSubscriptionRequest request) {
    LocalDate today = SubscriptionBillingService.today();
    Subscription subscription = findOwned(userId, id);

    boolean dateChanged = !request.nextBillingDate().equals(subscription.getNextBillingDate());
    if (dateChanged) {
      // Re-dating is only for the future - leaving an already-due date alone is fine (the nightly
      // job will bill it), but pushing it to a new past one would silently skip real charges.
      if (request.nextBillingDate().isBefore(today)) throw new InvalidRequestException("The next billing date can't be in the past");
      subscription.setBillingAnchorDay(request.nextBillingDate().getDayOfMonth());
      subscription.setReminderSentFor(null);
    }
    apply(userId, subscription, request);
    return toResponse(subscriptionRepository.save(subscription), today);
  }

  public SubscriptionResponse pause(UUID userId, UUID id) {
    Subscription subscription = findOwned(userId, id);
    requireNotCancelled(subscription);
    subscription.setStatus(SubscriptionStatus.PAUSED);
    return toResponse(subscriptionRepository.save(subscription), SubscriptionBillingService.today());
  }

  /** Resuming skips whatever came due while paused - those weren't billed, so the next billing
   * moves forward to the first date on or after today rather than back-charging the gap. */
  public SubscriptionResponse resume(UUID userId, UUID id) {
    LocalDate today = SubscriptionBillingService.today();
    Subscription subscription = findOwned(userId, id);
    requireNotCancelled(subscription);

    subscription.setStatus(SubscriptionStatus.ACTIVE);
    int guard = 0;
    while (subscription.getNextBillingDate().isBefore(today) && guard++ < 1000) {
      subscription.setNextBillingDate(subscription.getBillingCycle().next(subscription.getNextBillingDate(), subscription.getBillingAnchorDay()));
    }
    return toResponse(subscriptionRepository.save(subscription), today);
  }

  public SubscriptionResponse cancel(UUID userId, UUID id) {
    Subscription subscription = findOwned(userId, id);
    subscription.setStatus(SubscriptionStatus.CANCELLED);
    subscription.setCancelledAt(Instant.now());
    return toResponse(subscriptionRepository.save(subscription), SubscriptionBillingService.today());
  }

  /** Deletes the subscription; the expenses it already booked stay in the ledger. */
  public void delete(UUID userId, UUID id) {
    subscriptionRepository.delete(findOwned(userId, id));
  }

  /** "I used it today" - the quick way to keep a subscription out of the unused list. */
  public SubscriptionResponse logUse(UUID userId, UUID id, LocalDate date) {
    LocalDate today = SubscriptionBillingService.today();
    LocalDate usedOn = date == null ? today : date;
    if (usedOn.isAfter(today)) throw new InvalidRequestException("Usage can't be dated in the future");
    Subscription subscription = findOwned(userId, id);
    if (subscription.getLastUsedOn() == null || usedOn.isAfter(subscription.getLastUsedOn())) subscription.setLastUsedOn(usedOn);
    return toResponse(subscriptionRepository.save(subscription), today);
  }

  public SubscriptionResponse chargeNow(UUID userId, UUID id) {
    Subscription subscription = findOwned(userId, id);
    if (subscription.getStatus() != SubscriptionStatus.ACTIVE) throw new InvalidRequestException("Only an active subscription can be charged");
    if (subscription.getAccountId() == null) throw new InvalidRequestException("Choose an account for this subscription first");
    LocalDate today = SubscriptionBillingService.today();
    return toResponse(billingService.chargeNow(subscription, today), today);
  }

  @Transactional(readOnly = true)
  public List<SubscriptionChargeResponse> charges(UUID userId, UUID id) {
    Subscription subscription = findOwned(userId, id);
    return transactionRepository
        .findAllByUserIdAndSourceReferenceStartingWithOrderByTransactionDateDesc(userId, "subscription:" + subscription.getId() + ":")
        .stream()
        .map(t -> new SubscriptionChargeResponse(t.getId(), t.getTransactionDate(), t.getAmount(), t.getDescription()))
        .toList();
  }

  /** Turns a detected recurring pattern into a tracked subscription. auto-expense starts OFF: a
   * detected pattern exists precisely because its charges already arrive through bank import, and
   * auto-creating them again would double-count every one. */
  public SubscriptionResponse fromPattern(UUID userId, UUID patternId) {
    RecurringPattern pattern = recurringPatternRepository.findByIdAndUserId(patternId, userId).orElseThrow(() -> new RecurringPatternNotFoundException(patternId));
    BillingCycle cycle = cycleFor(pattern.getFrequency());
    LocalDate today = SubscriptionBillingService.today();

    Merchant merchant = pattern.getMerchantId() == null ? null : merchantRepository.findById(pattern.getMerchantId()).orElse(null);
    String name = merchant != null ? merchant.getName() : pattern.getMerchantKey() != null ? pattern.getMerchantKey() : "Subscription";

    LocalDate next = pattern.getNextExpectedDate() == null ? today.plusDays(1) : pattern.getNextExpectedDate().atZone(SubscriptionBillingService.ZONE).toLocalDate();
    int anchor = next.getDayOfMonth();
    int guard = 0;
    while (next.isBefore(today) && guard++ < 1000) next = cycle.next(next, anchor);

    Subscription subscription =
        Subscription.builder()
            .userId(userId)
            .name(name.length() > 200 ? name.substring(0, 200) : name)
            .amount(pattern.getAverageAmount() == null || pattern.getAverageAmount().signum() <= 0 ? BigDecimal.ONE : pattern.getAverageAmount().abs())
            .billingCycle(cycle)
            .nextBillingDate(next)
            .billingAnchorDay(anchor)
            .categoryId(pattern.getCategoryId())
            .autoCreateExpense(false)
            .build();
    return toResponse(subscriptionRepository.save(subscription), today);
  }

  // ---- helpers ----

  private void apply(UUID userId, Subscription subscription, SaveSubscriptionRequest request) {
    boolean autoCreate = request.autoCreateExpense() == null || request.autoCreateExpense();
    if (autoCreate && request.accountId() == null) {
      throw new InvalidRequestException("Choose the account to book each charge to, or turn off automatic expenses");
    }
    if (request.accountId() != null) {
      Account account = accountRepository.findByIdAndUserId(request.accountId(), userId).orElseThrow(() -> new AccountNotFoundException(request.accountId()));
      if (!account.isActive()) throw new InvalidRequestException("That account is inactive");
    }
    if (request.categoryId() != null && categoryRepository.findById(request.categoryId()).filter(c -> c.getUserId() == null || c.getUserId().equals(userId)).isEmpty()) {
      throw new CategoryNotFoundException(request.categoryId());
    }
    if (request.lastUsedOn() != null && request.lastUsedOn().isAfter(SubscriptionBillingService.today())) {
      throw new InvalidRequestException("Usage can't be dated in the future");
    }

    subscription.setName(request.name().trim());
    subscription.setAmount(request.amount());
    subscription.setBillingCycle(request.billingCycle());
    subscription.setNextBillingDate(request.nextBillingDate());
    subscription.setAccountId(request.accountId());
    subscription.setCategoryId(request.categoryId());
    subscription.setAutoCreateExpense(autoCreate);
    subscription.setReminderDaysBefore(request.reminderDaysBefore() == null ? 3 : request.reminderDaysBefore());
    subscription.setUsageRating(request.usageRating());
    subscription.setLastUsedOn(request.lastUsedOn());
    subscription.setNotes(request.notes() == null || request.notes().isBlank() ? null : request.notes().trim());
  }

  private static BillingCycle cycleFor(RecurringFrequency frequency) {
    if (frequency == null) throw new InvalidRequestException("This pattern has no billing frequency");
    return switch (frequency) {
      case WEEKLY -> BillingCycle.WEEKLY;
      case MONTHLY -> BillingCycle.MONTHLY;
      case QUARTERLY -> BillingCycle.QUARTERLY;
      case YEARLY -> BillingCycle.YEARLY;
      default -> throw new InvalidRequestException("Only weekly, monthly, quarterly and yearly patterns can be tracked as subscriptions");
    };
  }

  private void requireNotCancelled(Subscription subscription) {
    if (subscription.getStatus() == SubscriptionStatus.CANCELLED) throw new InvalidRequestException("A cancelled subscription can't be changed");
  }

  private Subscription findOwned(UUID userId, UUID id) {
    return subscriptionRepository.findByIdAndUserId(id, userId).orElseThrow(() -> new SubscriptionNotFoundException(id));
  }

  SubscriptionResponse toResponse(Subscription s, LocalDate today) {
    SubscriptionInsights.Flags flags = SubscriptionInsights.flags(s, today, highCostMonthly);
    return new SubscriptionResponse(
        s.getId(),
        s.getName(),
        s.getAmount(),
        s.getBillingCycle(),
        s.getBillingCycle().monthlyCost(s.getAmount()),
        s.getBillingCycle().yearlyCost(s.getAmount()),
        s.getNextBillingDate(),
        s.getStatus() == SubscriptionStatus.ACTIVE ? (int) ChronoUnit.DAYS.between(today, s.getNextBillingDate()) : null,
        s.getStatus(),
        s.getAccountId(),
        s.getCategoryId(),
        s.isAutoCreateExpense(),
        s.getReminderDaysBefore(),
        s.getLastBilledOn(),
        s.getUsageRating(),
        s.getLastUsedOn(),
        flags.lowUse(),
        flags.highCost(),
        flags.wasteful(),
        s.getNotes(),
        s.getCreatedAt());
  }
}
