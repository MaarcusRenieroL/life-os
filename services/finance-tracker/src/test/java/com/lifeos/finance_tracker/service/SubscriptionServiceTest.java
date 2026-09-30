package com.lifeos.finance_tracker.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.lifeos.finance_tracker.domains.dto.request.SaveSubscriptionRequest;
import com.lifeos.finance_tracker.domains.dto.response.SubscriptionResponse;
import com.lifeos.finance_tracker.domains.dto.response.SubscriptionSummaryResponse;
import com.lifeos.finance_tracker.domains.entity.Account;
import com.lifeos.finance_tracker.domains.entity.RecurringPattern;
import com.lifeos.finance_tracker.domains.entity.Subscription;
import com.lifeos.finance_tracker.domains.enums.BillingCycle;
import com.lifeos.finance_tracker.domains.enums.RecurringFrequency;
import com.lifeos.finance_tracker.domains.enums.SubscriptionStatus;
import com.lifeos.finance_tracker.exception.AccountNotFoundException;
import com.lifeos.finance_tracker.exception.InvalidRequestException;
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
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SubscriptionServiceTest {

  @Mock private SubscriptionRepository subscriptionRepository;
  @Mock private SubscriptionBillingService billingService;
  @Mock private AccountRepository accountRepository;
  @Mock private CategoryRepository categoryRepository;
  @Mock private MerchantRepository merchantRepository;
  @Mock private RecurringPatternRepository recurringPatternRepository;
  @Mock private TransactionRepository transactionRepository;

  private SubscriptionService service;

  private final UUID userId = UUID.randomUUID();
  private final Account account = Account.builder().id(UUID.randomUUID()).userId(userId).isActive(true).build();

  @BeforeEach
  void setUp() {
    service = new SubscriptionService(subscriptionRepository, billingService, accountRepository, categoryRepository, merchantRepository, recurringPatternRepository, transactionRepository);
    when(subscriptionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    when(accountRepository.findByIdAndUserId(account.getId(), userId)).thenReturn(Optional.of(account));
  }

  private LocalDate today() {
    return SubscriptionBillingService.today();
  }

  private SaveSubscriptionRequest request(LocalDate next, UUID accountId, Boolean auto) {
    return new SaveSubscriptionRequest(" Netflix ", new BigDecimal("649"), BillingCycle.MONTHLY, next, accountId, null, auto, null, null, null, "  ");
  }

  private Subscription stored(LocalDate next, SubscriptionStatus status) {
    Subscription s =
        Subscription.builder().id(UUID.randomUUID()).userId(userId).name("Spotify").amount(new BigDecimal("119")).billingCycle(BillingCycle.MONTHLY).nextBillingDate(next).billingAnchorDay(next.getDayOfMonth()).status(status).build();
    when(subscriptionRepository.findByIdAndUserId(s.getId(), userId)).thenReturn(Optional.of(s));
    return s;
  }

  @Test
  void createDefaultsToAutoExpenseAndThreeDayRemindersAndAnchorsOnTheBillingDay() {
    LocalDate next = today().plusDays(10);

    SubscriptionResponse response = service.create(userId, request(next, account.getId(), null));

    assertThat(response.name()).isEqualTo("Netflix");
    assertThat(response.autoCreateExpense()).isTrue();
    assertThat(response.reminderDaysBefore()).isEqualTo(3);
    assertThat(response.notes()).isNull();
    assertThat(response.status()).isEqualTo(SubscriptionStatus.ACTIVE);
    assertThat(response.daysUntilRenewal()).isEqualTo(10);
    assertThat(response.monthlyCost()).isEqualByComparingTo("649.00");
    assertThat(response.yearlyCost()).isEqualByComparingTo("7788.00");
  }

  @Test
  void createRejectsAPastBillingDate() {
    assertThatThrownBy(() -> service.create(userId, request(today().minusDays(1), account.getId(), true))).isInstanceOf(InvalidRequestException.class);
  }

  @Test
  void autoExpenseNeedsAnAccountButIsOptionalWhenTurnedOff() {
    assertThatThrownBy(() -> service.create(userId, request(today().plusDays(1), null, true))).isInstanceOf(InvalidRequestException.class);

    SubscriptionResponse manual = service.create(userId, request(today().plusDays(1), null, false));
    assertThat(manual.autoCreateExpense()).isFalse();
    assertThat(manual.accountId()).isNull();
  }

  @Test
  void anAccountThatIsntYoursOrIsInactiveIsRejected() {
    UUID foreign = UUID.randomUUID();
    when(accountRepository.findByIdAndUserId(foreign, userId)).thenReturn(Optional.empty());
    Account inactive = Account.builder().id(UUID.randomUUID()).userId(userId).isActive(false).build();
    when(accountRepository.findByIdAndUserId(inactive.getId(), userId)).thenReturn(Optional.of(inactive));

    assertThatThrownBy(() -> service.create(userId, request(today().plusDays(1), foreign, true))).isInstanceOf(AccountNotFoundException.class);
    assertThatThrownBy(() -> service.create(userId, request(today().plusDays(1), inactive.getId(), true))).isInstanceOf(InvalidRequestException.class);
  }

  @Test
  void updatingWithAnUnchangedDueDateIsAllowedButMovingItToThePastIsNot() {
    Subscription due = stored(today().minusDays(1), SubscriptionStatus.ACTIVE);
    due.setAccountId(account.getId());

    assertThat(service.update(userId, due.getId(), request(today().minusDays(1), account.getId(), true)).nextBillingDate()).isEqualTo(today().minusDays(1));
    assertThatThrownBy(() -> service.update(userId, due.getId(), request(today().minusDays(5), account.getId(), true))).isInstanceOf(InvalidRequestException.class);
  }

  @Test
  void changingTheDateReAnchorsAndClearsTheSentReminder() {
    Subscription s = stored(today().plusDays(3), SubscriptionStatus.ACTIVE);
    s.setReminderSentFor(today().plusDays(3));
    LocalDate newDate = today().plusDays(20);

    service.update(userId, s.getId(), request(newDate, account.getId(), true));

    assertThat(s.getBillingAnchorDay()).isEqualTo(newDate.getDayOfMonth());
    assertThat(s.getReminderSentFor()).isNull();
  }

  @Test
  void resumingSkipsTheCyclesMissedWhilePausedInsteadOfBackCharging() {
    Subscription s = stored(today().minusMonths(2).minusDays(3), SubscriptionStatus.PAUSED);

    SubscriptionResponse response = service.resume(userId, s.getId());

    assertThat(response.status()).isEqualTo(SubscriptionStatus.ACTIVE);
    assertThat(response.nextBillingDate()).isAfterOrEqualTo(today());
    assertThat(response.nextBillingDate()).isBefore(today().plusMonths(1).plusDays(1));
    verify(billingService, never()).billDue(any(), any());
  }

  @Test
  void aCancelledSubscriptionCantBePausedOrResumed() {
    Subscription s = stored(today().plusDays(5), SubscriptionStatus.CANCELLED);

    assertThatThrownBy(() -> service.pause(userId, s.getId())).isInstanceOf(InvalidRequestException.class);
    assertThatThrownBy(() -> service.resume(userId, s.getId())).isInstanceOf(InvalidRequestException.class);
  }

  @Test
  void cancellingStampsTheTimeAndDropsTheRenewalDate() {
    Subscription s = stored(today().plusDays(5), SubscriptionStatus.ACTIVE);

    SubscriptionResponse response = service.cancel(userId, s.getId());

    assertThat(response.status()).isEqualTo(SubscriptionStatus.CANCELLED);
    assertThat(s.getCancelledAt()).isNotNull();
    assertThat(response.daysUntilRenewal()).isNull();
  }

  @Test
  void loggingUseKeepsTheMostRecentDateAndRejectsTheFuture() {
    Subscription s = stored(today().plusDays(5), SubscriptionStatus.ACTIVE);
    s.setLastUsedOn(today().minusDays(2));

    assertThat(service.logUse(userId, s.getId(), today().minusDays(10)).lastUsedOn()).isEqualTo(today().minusDays(2));
    assertThat(service.logUse(userId, s.getId(), null).lastUsedOn()).isEqualTo(today());
    assertThatThrownBy(() -> service.logUse(userId, s.getId(), today().plusDays(1))).isInstanceOf(InvalidRequestException.class);
  }

  @Test
  void chargeNowNeedsAnActiveSubscriptionWithAnAccount() {
    Subscription noAccount = stored(today().plusDays(5), SubscriptionStatus.ACTIVE);
    Subscription paused = stored(today().plusDays(5), SubscriptionStatus.PAUSED);
    paused.setAccountId(account.getId());

    assertThatThrownBy(() -> service.chargeNow(userId, noAccount.getId())).isInstanceOf(InvalidRequestException.class);
    assertThatThrownBy(() -> service.chargeNow(userId, paused.getId())).isInstanceOf(InvalidRequestException.class);
  }

  @Test
  void anotherUsersSubscriptionIsNotFound() {
    UUID id = UUID.randomUUID();
    when(subscriptionRepository.findByIdAndUserId(id, userId)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.get(userId, id)).isInstanceOf(SubscriptionNotFoundException.class);
    assertThatThrownBy(() -> service.delete(userId, id)).isInstanceOf(SubscriptionNotFoundException.class);
    assertThatThrownBy(() -> service.charges(userId, id)).isInstanceOf(SubscriptionNotFoundException.class);
  }

  @Test
  void summaryTotalsActiveSubscriptionsOnlyAndSurfacesTheWastefulAndRenewingSoonOnes() {
    Subscription wasteful = stored(today().plusDays(2), SubscriptionStatus.ACTIVE);
    wasteful.setAmount(new BigDecimal("1200"));
    wasteful.setUsageRating(1);
    Subscription fine = stored(today().plusDays(20), SubscriptionStatus.ACTIVE);
    fine.setAmount(new BigDecimal("300"));
    Subscription yearly = stored(today().plusDays(40), SubscriptionStatus.ACTIVE);
    yearly.setBillingCycle(BillingCycle.YEARLY);
    yearly.setAmount(new BigDecimal("2400"));
    Subscription cancelled = stored(today().plusDays(1), SubscriptionStatus.CANCELLED);
    cancelled.setAmount(new BigDecimal("9999"));
    when(subscriptionRepository.findAllByUserIdOrderByNextBillingDateAsc(userId)).thenReturn(List.of(wasteful, fine, yearly, cancelled));

    SubscriptionSummaryResponse summary = service.summary(userId);

    assertThat(summary.activeCount()).isEqualTo(3);
    assertThat(summary.monthlyTotal()).isEqualByComparingTo("1700.00");
    assertThat(summary.yearlyTotal()).isEqualByComparingTo("20400.00");
    assertThat(summary.wastefulCount()).isEqualTo(1);
    assertThat(summary.wastefulMonthly()).isEqualByComparingTo("1200.00");
    assertThat(summary.renewingSoonCount()).isEqualTo(1);
    assertThat(summary.renewingSoonTotal()).isEqualByComparingTo("1200");
  }

  @Test
  void fromPatternTracksItWithAutoExpenseOffAndRollsAPastDateForward() {
    UUID patternId = UUID.randomUUID();
    Instant past = today().minusDays(40).atStartOfDay(SubscriptionBillingService.ZONE).toInstant();
    RecurringPattern pattern =
        RecurringPattern.builder().id(patternId).userId(userId).merchantKey("hotstar").averageAmount(new BigDecimal("299")).frequency(RecurringFrequency.MONTHLY).nextExpectedDate(past).build();
    when(recurringPatternRepository.findByIdAndUserId(patternId, userId)).thenReturn(Optional.of(pattern));

    SubscriptionResponse response = service.fromPattern(userId, patternId);

    assertThat(response.name()).isEqualTo("hotstar");
    assertThat(response.autoCreateExpense()).isFalse();
    assertThat(response.billingCycle()).isEqualTo(BillingCycle.MONTHLY);
    assertThat(response.nextBillingDate()).isAfterOrEqualTo(today());
    assertThat(response.amount()).isEqualByComparingTo("299");
  }

  @Test
  void aPatternWithAnUntrackableFrequencyIsRejected() {
    UUID patternId = UUID.randomUUID();
    RecurringPattern pattern = RecurringPattern.builder().id(patternId).userId(userId).averageAmount(BigDecimal.TEN).frequency(RecurringFrequency.DAILY).build();
    when(recurringPatternRepository.findByIdAndUserId(patternId, userId)).thenReturn(Optional.of(pattern));

    assertThatThrownBy(() -> service.fromPattern(userId, patternId)).isInstanceOf(InvalidRequestException.class);
  }
}
