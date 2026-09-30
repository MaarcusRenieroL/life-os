package com.lifeos.finance_tracker;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.lifeos.finance_tracker.controller.InternalSubscriptionController;
import com.lifeos.finance_tracker.controller.InternalSubscriptionController.EmailSubscriptionRequest;
import com.lifeos.finance_tracker.domains.dto.request.SaveSubscriptionRequest;
import com.lifeos.finance_tracker.domains.dto.response.SubscriptionResponse;
import com.lifeos.finance_tracker.domains.entity.Subscription;
import com.lifeos.finance_tracker.domains.enums.BillingCycle;
import com.lifeos.finance_tracker.exception.InvalidRequestException;
import com.lifeos.finance_tracker.repository.SubscriptionRepository;
import com.lifeos.finance_tracker.service.SubscriptionBillingService;
import com.lifeos.finance_tracker.service.SubscriptionService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class InternalSubscriptionControllerTest {

  @Mock private SubscriptionService subscriptionService;
  @Mock private SubscriptionRepository subscriptionRepository;
  @InjectMocks private InternalSubscriptionController controller;

  private final UUID userId = UUID.randomUUID();

  private static EmailSubscriptionRequest request(BigDecimal amount, BillingCycle cycle, LocalDate next) {
    return new EmailSubscriptionRequest("Netflix", amount, cycle, next, null);
  }

  @Test
  void aSubscriptionAlreadyTrackedIsLeftExactlyAsItIs() {
    Subscription existing = Subscription.builder().id(UUID.randomUUID()).userId(userId).name("netflix").build();
    when(subscriptionRepository.findFirstByUserIdAndNameIgnoreCase(userId, "Netflix")).thenReturn(Optional.of(existing));

    var body = controller.create(userId, request(BigDecimal.TEN, BillingCycle.MONTHLY, LocalDate.now().plusDays(5))).getBody().getData();

    assertThat(body.created()).isFalse();
    assertThat(body.id()).isEqualTo(existing.getId());
    verify(subscriptionService, never()).create(any(), any());
  }

  @Test
  void aBillingDateAlreadyPastIsRolledForwardToTheNextOne() {
    LocalDate today = SubscriptionBillingService.today();
    when(subscriptionRepository.findFirstByUserIdAndNameIgnoreCase(any(), any())).thenReturn(Optional.empty());
    SubscriptionResponse saved = org.mockito.Mockito.mock(SubscriptionResponse.class);
    when(saved.id()).thenReturn(UUID.randomUUID());
    when(subscriptionService.create(any(), any())).thenReturn(saved);

    // Charged 40 days ago on a monthly plan: the next charge is still ahead of today.
    controller.create(userId, request(new BigDecimal("649"), BillingCycle.MONTHLY, today.minusDays(40)));

    ArgumentCaptor<SaveSubscriptionRequest> captor = ArgumentCaptor.forClass(SaveSubscriptionRequest.class);
    verify(subscriptionService).create(any(), captor.capture());
    assertThat(captor.getValue().nextBillingDate()).isAfterOrEqualTo(today);
    assertThat(captor.getValue().nextBillingDate()).isBefore(today.plusMonths(1).plusDays(1));
    assertThat(captor.getValue().name()).isEqualTo("Netflix");
    // SubscriptionService rejects auto-booking with no account, and auto-booking would double-count
    // charges that bank import already records - so an email-found subscription must be tracking-only.
    assertThat(captor.getValue().autoCreateExpense()).isFalse();
    assertThat(captor.getValue().accountId()).isNull();
  }

  @Test
  void incompleteRequestsAreRejectedBeforeAnythingIsSaved() {
    assertThatThrownBy(() -> controller.create(userId, request(null, BillingCycle.MONTHLY, LocalDate.now()))).isInstanceOf(InvalidRequestException.class);
    assertThatThrownBy(() -> controller.create(userId, request(BigDecimal.ZERO, BillingCycle.MONTHLY, LocalDate.now()))).isInstanceOf(InvalidRequestException.class);
    assertThatThrownBy(() -> controller.create(userId, request(BigDecimal.TEN, null, LocalDate.now()))).isInstanceOf(InvalidRequestException.class);
    assertThatThrownBy(() -> controller.create(userId, new EmailSubscriptionRequest(" ", BigDecimal.TEN, BillingCycle.MONTHLY, LocalDate.now(), null))).isInstanceOf(InvalidRequestException.class);
    verify(subscriptionService, never()).create(any(), any());
  }
}
