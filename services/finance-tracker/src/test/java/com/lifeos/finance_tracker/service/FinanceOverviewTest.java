package com.lifeos.finance_tracker.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import com.lifeos.finance_tracker.domains.entity.Account;
import com.lifeos.finance_tracker.domains.entity.Subscription;
import com.lifeos.finance_tracker.domains.entity.Transaction;
import com.lifeos.finance_tracker.domains.entity.UserFinanceSettings;
import com.lifeos.finance_tracker.domains.enums.SubscriptionStatus;
import com.lifeos.finance_tracker.domains.enums.TransactionType;
import com.lifeos.finance_tracker.domains.record.DashboardSummary;
import com.lifeos.finance_tracker.domains.record.FinanceOverview;
import com.lifeos.finance_tracker.repository.AccountRepository;
import com.lifeos.finance_tracker.repository.SubscriptionRepository;
import com.lifeos.finance_tracker.repository.TransactionRepository;
import com.lifeos.finance_tracker.repository.UserFinanceSettingsRepository;
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
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

@ExtendWith(MockitoExtension.class)
class FinanceOverviewTest {

  private static final LocalDate TODAY = LocalDate.of(2026, 10, 10);

  @Test
  void safeToSpendIsExpectedIncomeMinusSpentMinusBillsStillToCome() {
    FinanceOverview o =
        FinanceOverview.compute(TODAY, LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 31), 1, new BigDecimal("125000"),
            new BigDecimal("125000"), new BigDecimal("40000"), new BigDecimal("5000"), new BigDecimal("300000"), null);

    assertThat(o.safeToSpend()).isEqualByComparingTo("80000");
    assertThat(o.daysLeft()).isEqualTo(22); // 10 Oct .. 31 Oct inclusive
    assertThat(o.safeToSpendPerDay()).isEqualByComparingTo("3636.36");
  }

  @Test
  void withoutAStatedSalaryTheIncomeThatHasArrivedIsUsed() {
    FinanceOverview o =
        FinanceOverview.compute(TODAY, LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 31), 1, new BigDecimal("60000"), null,
            new BigDecimal("10000"), BigDecimal.ZERO, BigDecimal.ZERO, null);

    assertThat(o.expectedIncome()).isEqualByComparingTo("60000");
    assertThat(o.safeToSpend()).isEqualByComparingTo("50000");
  }

  @Test
  void overspendingReadsAsZeroPerDayNotANegativeBudget() {
    FinanceOverview o =
        FinanceOverview.compute(TODAY, LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 31), 1, BigDecimal.ZERO,
            new BigDecimal("50000"), new BigDecimal("52000"), BigDecimal.ZERO, BigDecimal.ZERO, null);

    assertThat(o.safeToSpend()).isEqualByComparingTo("-2000");
    assertThat(o.safeToSpendPerDay()).isEqualByComparingTo("0");
  }

  @Test
  void theLastDayOfTheCycleStillHasOneDayLeft() {
    FinanceOverview o =
        FinanceOverview.compute(LocalDate.of(2026, 10, 31), LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 31), 1, BigDecimal.ZERO,
            new BigDecimal("1000"), BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, null);

    assertThat(o.daysLeft()).isEqualTo(1);
    assertThat(o.safeToSpendPerDay()).isEqualByComparingTo("1000");
  }

  // ---- the wiring: payday detection, net worth, upcoming bills -------------------------------

  @Mock private TransactionRepository transactionRepository;
  @Mock private UserFinanceSettingsRepository settingsRepository;
  @Mock private AccountRepository accountRepository;
  @Mock private SubscriptionRepository subscriptionRepository;
  @Mock private ObjectProvider<AnalyticsService> self;

  private final UUID userId = UUID.randomUUID();
  private AnalyticsService service;
  @BeforeEach
  void setUp() {
    service = new AnalyticsService(transactionRepository, settingsRepository, accountRepository, subscriptionRepository, self);
    lenient().when(transactionRepository.getDashboardSummary(eq(userId), any(), any())).thenReturn(new DashboardSummary(new BigDecimal("125000"), new BigDecimal("40000"), null));
    lenient().when(subscriptionRepository.findAllByUserIdOrderByNextBillingDateAsc(userId)).thenReturn(List.of());
    lenient().when(accountRepository.findAllByUserId(userId)).thenReturn(List.of());
    principal = new UsernamePasswordAuthenticationToken(userId, null, List.of());
  }

  private Authentication principal;

  private void salaryOn(String isoInstant, String amount) {
    Transaction credit = Transaction.builder().userId(userId).type(TransactionType.CREDIT).amount(new BigDecimal(amount)).transactionDate(Instant.parse(isoInstant)).build();
    when(transactionRepository.findAllByUserIdAndTypeAndTransactionDateAfterAndIsDuplicateFalseAndIsTransferFalseOrderByAmountDesc(eq(userId), eq(TransactionType.CREDIT), any(), any()))
        .thenReturn(List.of(credit));
  }

  @Test
  void aSalarySizedCreditOnTheThirtiethSuggestsStartingTheCycleThere() {
    when(settingsRepository.findById(userId)).thenReturn(Optional.of(UserFinanceSettings.builder().userId(userId).monthlyIncome(new BigDecimal("125000")).payCycleStartDay(1).build()));
    salaryOn("2026-09-30T04:00:00Z", "125000");

    FinanceOverview o = service.getOverview(principal);

    assertThat(o.suggestedPayCycleStartDay()).isEqualTo(28);
  }

  @Test
  void aSmallCreditIsNotMistakenForSalary() {
    when(settingsRepository.findById(userId)).thenReturn(Optional.of(UserFinanceSettings.builder().userId(userId).monthlyIncome(new BigDecimal("125000")).payCycleStartDay(1).build()));
    salaryOn("2026-09-30T04:00:00Z", "2500");

    assertThat(service.getOverview(principal).suggestedPayCycleStartDay()).isNull();
  }

  @Test
  void noSuggestionOnceThePayCycleHasBeenSetOrSalaryLandsOnTheFirst() {
    when(settingsRepository.findById(userId)).thenReturn(Optional.of(UserFinanceSettings.builder().userId(userId).monthlyIncome(new BigDecimal("125000")).payCycleStartDay(28).build()));
    assertThat(service.getOverview(principal).suggestedPayCycleStartDay()).isNull();

    when(settingsRepository.findById(userId)).thenReturn(Optional.of(UserFinanceSettings.builder().userId(userId).monthlyIncome(new BigDecimal("125000")).payCycleStartDay(1).build()));
    salaryOn("2026-09-30T20:00:00Z", "125000"); // 1 Oct 01:30 IST
    assertThat(service.getOverview(principal).suggestedPayCycleStartDay()).isNull();
  }

  @Test
  void netWorthSumsActiveAccountsSoCreditCardDebtSubtracts() {
    when(settingsRepository.findById(userId)).thenReturn(Optional.empty());
    Account savings = Account.builder().isActive(true).currentBalance(new BigDecimal("184250.50")).build();
    Account card = Account.builder().isActive(true).currentBalance(new BigDecimal("-42300.75")).build();
    Account closed = Account.builder().isActive(false).currentBalance(new BigDecimal("999999")).build();
    when(accountRepository.findAllByUserId(userId)).thenReturn(List.of(savings, card, closed));

    assertThat(service.getOverview(principal).netWorth()).isEqualByComparingTo("141949.75");
  }

  @Test
  void onlyActiveBillsDueBeforeTheCycleEndsCountAsUpcoming() {
    when(settingsRepository.findById(userId)).thenReturn(Optional.empty());
    LocalDate today = LocalDate.now(com.lifeos.finance_tracker.util.PayCycle.ZONE);
    com.lifeos.finance_tracker.util.PayCycle.Window cycle = com.lifeos.finance_tracker.util.PayCycle.containing(Instant.now(), 1);
    Subscription due = Subscription.builder().status(SubscriptionStatus.ACTIVE).amount(new BigDecimal("649")).nextBillingDate(cycle.lastDay()).build();
    Subscription past = Subscription.builder().status(SubscriptionStatus.ACTIVE).amount(new BigDecimal("199")).nextBillingDate(today.minusDays(1)).build();
    Subscription later = Subscription.builder().status(SubscriptionStatus.ACTIVE).amount(new BigDecimal("999")).nextBillingDate(cycle.lastDay().plusDays(1)).build();
    Subscription cancelled = Subscription.builder().status(SubscriptionStatus.CANCELLED).amount(new BigDecimal("299")).nextBillingDate(cycle.lastDay()).build();
    when(subscriptionRepository.findAllByUserIdOrderByNextBillingDateAsc(userId)).thenReturn(List.of(due, past, later, cancelled));

    assertThat(service.getOverview(principal).upcomingBills()).isEqualByComparingTo("649");
  }
}
