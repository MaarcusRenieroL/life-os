package com.lifeos.finance_tracker.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.lifeos.common.events.BankAlertEventRecord;
import com.lifeos.finance_tracker.domains.dto.request.CreateEmailAlertTransactionRequest;
import com.lifeos.finance_tracker.domains.dto.request.ReportImportFailureRequest;
import com.lifeos.finance_tracker.domains.entity.ImportFailure;
import com.lifeos.finance_tracker.domains.enums.AccountType;
import com.lifeos.finance_tracker.exception.AccountNotFoundException;
import com.lifeos.finance_tracker.exception.InvalidRequestException;
import com.lifeos.finance_tracker.repository.ImportFailureRepository;
import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

@ExtendWith(MockitoExtension.class)
class ImportFailureServiceTest {

  @Mock private ImportFailureRepository repository;
  @Mock private TransactionService transactionService;

  private ImportFailureService service;
  private final UUID userId = UUID.randomUUID();
  private final Authentication auth = new UsernamePasswordAuthenticationToken(userId, null, List.of());

  private BankAlertEventRecord salary() {
    return new BankAlertEventRecord(userId, "HDFC Bank", "SAVINGS", new BigDecimal("125000.00"), "CREDIT", Instant.parse("2026-09-30T04:00:00Z"), "Credit via NEFT", "msg-1");
  }

  @BeforeEach
  void setUp() {
    service = new ImportFailureService(repository, transactionService);
  }

  private ImportFailure saved() {
    ArgumentCaptor<ImportFailure> captor = ArgumentCaptor.forClass(ImportFailure.class);
    verify(repository).save(captor.capture());
    return captor.getValue();
  }

  @Test
  void aSalaryAlertWithNoAccountIsKeptWithEverythingNeededToReplayIt() {
    when(repository.findByUserIdAndReference(userId, "msg-1")).thenReturn(Optional.empty());

    service.recordNoAccount(salary(), "No SAVINGS account found for bank: HDFC Bank");

    ImportFailure failure = saved();
    assertThat(failure.getReason()).isEqualTo("NO_ACCOUNT");
    assertThat(failure.getStatus()).isEqualTo(ImportFailure.OPEN);
    assertThat(failure.getPayload()).contains("125000").contains("HDFC Bank").contains("msg-1");
  }

  @Test
  void retryingBooksTheAlertAndResolvesIt() {
    ImportFailure failure = ImportFailure.builder().id(UUID.randomUUID()).userId(userId).reference("msg-1").reason("NO_ACCOUNT").build();
    when(repository.findByUserIdAndReference(userId, "msg-1")).thenReturn(Optional.empty());
    service.recordNoAccount(salary(), "x");
    failure.setPayload(saved().getPayload());
    when(repository.findByIdAndUserId(failure.getId(), userId)).thenReturn(Optional.of(failure));

    service.retry(auth, failure.getId());

    ArgumentCaptor<CreateEmailAlertTransactionRequest> request = ArgumentCaptor.forClass(CreateEmailAlertTransactionRequest.class);
    verify(transactionService).createFromEmailAlert(request.capture());
    assertThat(request.getValue().getAmount()).isEqualByComparingTo("125000.00");
    assertThat(request.getValue().getAccountType()).isEqualTo(AccountType.SAVINGS);
    assertThat(request.getValue().getSourceReference()).isEqualTo("msg-1");
    assertThat(failure.getStatus()).isEqualTo(ImportFailure.RESOLVED);
    assertThat(failure.getResolvedAt()).isNotNull();
  }

  @Test
  void retryingWithTheAccountStillMissingExplainsWhatToDo() {
    ImportFailure failure = ImportFailure.builder().id(UUID.randomUUID()).userId(userId).reference("msg-1").build();
    when(repository.findByUserIdAndReference(userId, "msg-1")).thenReturn(Optional.empty());
    service.recordNoAccount(salary(), "x");
    failure.setPayload(saved().getPayload());
    when(repository.findByIdAndUserId(failure.getId(), userId)).thenReturn(Optional.of(failure));
    doThrow(new AccountNotFoundException("HDFC Bank", AccountType.SAVINGS)).when(transactionService).createFromEmailAlert(any());

    assertThatThrownBy(() -> service.retry(auth, failure.getId()))
        .isInstanceOf(InvalidRequestException.class)
        .hasMessageContaining("HDFC Bank")
        .hasMessageContaining("Create it in Accounts");
    assertThat(failure.getStatus()).isEqualTo(ImportFailure.OPEN);
  }

  @Test
  void anUnreadableEmailCannotBeRetriedButCanBeDismissed() {
    ImportFailure failure = ImportFailure.builder().id(UUID.randomUUID()).userId(userId).reference("m").reason("UNPARSED").build();
    when(repository.findByIdAndUserId(failure.getId(), userId)).thenReturn(Optional.of(failure));

    assertThatThrownBy(() -> service.retry(auth, failure.getId())).isInstanceOf(InvalidRequestException.class).hasMessageContaining("nothing to retry");

    service.dismiss(auth, failure.getId());
    assertThat(failure.getStatus()).isEqualTo(ImportFailure.DISMISSED);
  }

  @Test
  void creatingAnAccountRetriesOnlyWhatWasWaitingForOne() throws Exception {
    when(repository.findByUserIdAndReference(userId, "msg-1")).thenReturn(Optional.empty());
    service.recordNoAccount(salary(), "x");
    String payload = saved().getPayload();
    ImportFailure waiting = ImportFailure.builder().id(UUID.randomUUID()).userId(userId).reference("msg-1").reason("NO_ACCOUNT").payload(payload).build();
    ImportFailure unparsed = ImportFailure.builder().id(UUID.randomUUID()).userId(userId).reference("msg-2").reason("UNPARSED").build();
    when(repository.findAllByUserIdAndStatusOrderByCreatedAtDesc(userId, ImportFailure.OPEN)).thenReturn(List.of(waiting, unparsed));

    int booked = service.retryWaiting(userId);

    assertThat(booked).isEqualTo(1);
    assertThat(waiting.getStatus()).isEqualTo(ImportFailure.RESOLVED);
    assertThat(unparsed.getStatus()).isEqualTo(ImportFailure.OPEN);
  }

  @Test
  void anAlertThatStillHasNoAccountDoesNotBreakTheAccountBeingCreated() throws Exception {
    when(repository.findByUserIdAndReference(userId, "msg-1")).thenReturn(Optional.empty());
    service.recordNoAccount(salary(), "x");
    ImportFailure waiting = ImportFailure.builder().id(UUID.randomUUID()).userId(userId).reference("msg-1").reason("NO_ACCOUNT").payload(saved().getPayload()).build();
    when(repository.findAllByUserIdAndStatusOrderByCreatedAtDesc(userId, ImportFailure.OPEN)).thenReturn(List.of(waiting));
    doThrow(new AccountNotFoundException("HDFC Bank", AccountType.SAVINGS)).when(transactionService).createFromEmailAlert(any());

    assertThat(service.retryWaiting(userId)).isZero();
    assertThat(waiting.getStatus()).isEqualTo(ImportFailure.OPEN);
  }

  @Test
  void anEmailTheUserAlreadyDismissedIsNotReopenedWhenItIsReportedAgain() {
    ImportFailure dismissed = ImportFailure.builder().userId(userId).reference("m9").status(ImportFailure.DISMISSED).build();
    when(repository.findByUserIdAndReference(userId, "m9")).thenReturn(Optional.of(dismissed));
    ReportImportFailureRequest again = new ReportImportFailureRequest();
    set(again, "userId", userId);
    set(again, "reference", "m9");
    set(again, "subject", "Statement ready");

    service.recordUnparsed(again);

    verify(repository, never()).save(any());
    assertThat(dismissed.getStatus()).isEqualTo(ImportFailure.DISMISSED);
  }

  @Test
  void anUnparsedEmailIsStoredOnceHoweverOftenItIsReported() {
    when(repository.findByUserIdAndReference(userId, "m1")).thenReturn(Optional.empty());
    ReportImportFailureRequest request = new ReportImportFailureRequest();
    set(request, "userId", userId);
    set(request, "reference", "m1");
    set(request, "sender", "alerts@hdfcbank.bank.in");
    set(request, "subject", "Rs. 1,25,000 credited");
    set(request, "snippet", "x".repeat(2000));

    service.recordUnparsed(request);

    ImportFailure failure = saved();
    assertThat(failure.getReason()).isEqualTo("UNPARSED");
    assertThat(failure.getSnippet()).hasSize(600);
  }

  private static void set(Object target, String name, Object value) {
    try {
      Field field = target.getClass().getDeclaredField(name);
      field.setAccessible(true);
      field.set(target, value);
    } catch (ReflectiveOperationException e) {
      throw new RuntimeException(e);
    }
  }
}
