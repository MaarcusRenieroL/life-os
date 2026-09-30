package com.lifeos.core.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.lifeos.common.events.EmailHubEventRecord;
import com.lifeos.core.config.EmailHubProperties;
import com.lifeos.core.domains.entity.EmailHubItem;
import com.lifeos.core.domains.enums.EmailHubStatus;
import com.lifeos.core.domains.record.EmailClassification;
import com.lifeos.core.exception.AiUnavailableException;
import com.lifeos.core.integration.EmailHubAiClient;
import com.lifeos.core.repository.EmailHubItemRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
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
class EmailHubServiceTest {

  @Mock private EmailHubItemRepository repository;
  @Mock private EmailHubAiClient ai;
  @Mock private EmailActionExecutor executor;

  private final UUID userId = UUID.randomUUID();
  private final List<EmailHubItem> saved = new ArrayList<>();
  private EmailHubService service;

  @BeforeEach
  void setUp() {
    when(repository.save(any())).thenAnswer(invocation -> {
      EmailHubItem item = invocation.getArgument(0);
      if (item.getId() == null) item.setId(UUID.randomUUID());
      saved.removeIf(existing -> existing.getId().equals(item.getId()));
      saved.add(item);
      return item;
    });
    when(repository.findByIdAndUserId(any(), any())).thenAnswer(invocation -> saved.stream().filter(i -> i.getId().equals(invocation.getArgument(0))).findFirst());
    service = new EmailHubService(repository, ai, executor, new EmailHubProperties(true, "Asia/Kolkata", false));
  }

  private String inDays(int days) {
    return LocalDate.now(ZoneId.of("Asia/Kolkata")).plusDays(days).toString();
  }

  private EmailHubEventRecord email(String id) {
    return new EmailHubEventRecord(userId, id, "t", "hr@acme.com", "Please submit the form", "Body text", Instant.now());
  }

  private EmailClassification confidentTask() {
    return new EmailClassification("TASK", "HIGH", "Submit a form", new EmailClassification.Task("Submit the form", inDays(3), null, "HIGH", null), null, null, null);
  }

  @Test
  void aConfidentActionableEmailIsAppliedAndRecordedForUndo() {
    when(ai.classify(anyString(), anyString(), anyString())).thenReturn(confidentTask());
    when(executor.execute(any(), any())).thenReturn(new EmailActionExecutor.Result("tasks", "task-1", true, null));

    service.ingest(email("m1"));

    assertThat(saved).singleElement().satisfies(item -> {
      assertThat(item.getStatus()).isEqualTo(EmailHubStatus.APPLIED);
      assertThat(item.getTargetModule()).isEqualTo("tasks");
      assertThat(item.getTargetId()).isEqualTo("task-1");
      assertThat(item.getProposal()).containsEntry("kind", "TASK");
    });
  }

  @Test
  void anEmailAlreadySeenIsNeverClassifiedAgain() {
    when(repository.existsByUserIdAndGmailMessageId(userId, "m1")).thenReturn(true);

    service.ingest(email("m1"));

    verify(ai, never()).classify(any(), any(), any());
    assertThat(saved).isEmpty();
  }

  @Test
  void whenNoModelIsAvailableNothingIsRecordedSoTheNextPollRetries() {
    when(ai.classify(anyString(), anyString(), anyString())).thenThrow(new AiUnavailableException("Ollama is not enabled"));

    service.ingest(email("m1"));

    assertThat(saved).isEmpty();
    verify(executor, never()).execute(any(), any());
  }

  @Test
  void nonActionableMailIsRecordedAsIgnoredWithoutTouchingAnyModule() {
    when(ai.classify(anyString(), anyString(), anyString())).thenReturn(new EmailClassification("IGNORE", "HIGH", "A newsletter", null, null, null, null));

    service.ingest(email("m1"));

    assertThat(saved).singleElement().extracting(EmailHubItem::getStatus).isEqualTo(EmailHubStatus.IGNORED);
    verify(executor, never()).execute(any(), any());
  }

  @Test
  void anUncertainProposalWaitsForApprovalThenIsApplied() {
    when(ai.classify(anyString(), anyString(), anyString()))
        .thenReturn(new EmailClassification("TASK", "MEDIUM", "s", new EmailClassification.Task("Maybe reply", inDays(2), null, "MEDIUM", null), null, null, null));
    service.ingest(email("m1"));
    EmailHubItem item = saved.get(0);
    assertThat(item.getStatus()).isEqualTo(EmailHubStatus.NEEDS_REVIEW);
    verify(executor, never()).execute(any(), any());

    when(executor.execute(any(), any())).thenReturn(new EmailActionExecutor.Result("tasks", "task-9", true, null));
    EmailHubItem approved = service.approve(userId, item.getId());

    assertThat(approved.getStatus()).isEqualTo(EmailHubStatus.APPLIED);
    assertThat(approved.getTargetId()).isEqualTo("task-9");
  }

  @Test
  void withAutoApplyOffEverythingWaitsForApproval() {
    service = new EmailHubService(repository, ai, executor, new EmailHubProperties(false, "Asia/Kolkata", false));
    when(ai.classify(anyString(), anyString(), anyString())).thenReturn(confidentTask());

    service.ingest(email("m1"));

    assertThat(saved.get(0).getStatus()).isEqualTo(EmailHubStatus.NEEDS_REVIEW);
    verify(executor, never()).execute(any(), any());
  }

  @Test
  void aModuleRejectingTheActionIsRecordedAsFailedNotLost() {
    when(ai.classify(anyString(), anyString(), anyString())).thenReturn(confidentTask());
    when(executor.execute(any(), any())).thenThrow(new EmailActionExecutor.EmailActionException("The next billing date can't be in the past"));

    service.ingest(email("m1"));

    assertThat(saved.get(0).getStatus()).isEqualTo(EmailHubStatus.FAILED);
    assertThat(saved.get(0).getNote()).contains("billing date");
  }

  @Test
  void aSubscriptionThatWasAlreadyTrackedIsNotMarkedUndoable() {
    when(ai.classify(anyString(), anyString(), anyString()))
        .thenReturn(new EmailClassification("SUBSCRIPTION", "HIGH", "s", null, null, null, new EmailClassification.Subscription("Netflix", 649.0, "INR", "MONTHLY", inDays(10))));
    when(executor.execute(any(), any())).thenReturn(new EmailActionExecutor.Result("finance", "sub-1", false, "Already in your subscriptions"));

    service.ingest(email("m1"));
    EmailHubItem item = saved.get(0);
    EmailHubItem afterUndo = service.undo(userId, item.getId());

    assertThat(item.getStatus()).isEqualTo(EmailHubStatus.IGNORED);
    assertThat(afterUndo.getStatus()).isEqualTo(EmailHubStatus.IGNORED);
    verify(executor, never()).undo(any(), any(), any());
  }

  @Test
  void undoRemovesWhatWasCreatedAndAFailedUndoKeepsTheItemApplied() {
    when(ai.classify(anyString(), anyString(), anyString())).thenReturn(confidentTask());
    when(executor.execute(any(), any())).thenReturn(new EmailActionExecutor.Result("tasks", "task-1", true, null));
    service.ingest(email("m1"));
    EmailHubItem item = saved.get(0);

    org.mockito.Mockito.doThrow(new EmailActionExecutor.EmailActionException("tasks is down")).when(executor).undo(userId, "tasks", "task-1");
    assertThat(service.undo(userId, item.getId()).getStatus()).isEqualTo(EmailHubStatus.APPLIED);

    org.mockito.Mockito.doNothing().when(executor).undo(userId, "tasks", "task-1");
    assertThat(service.undo(userId, item.getId()).getStatus()).isEqualTo(EmailHubStatus.UNDONE);
  }

  @Test
  void dismissOnlyAppliesToItemsStillWaiting() {
    when(ai.classify(anyString(), anyString(), anyString())).thenReturn(confidentTask());
    when(executor.execute(any(), any())).thenReturn(new EmailActionExecutor.Result("tasks", "task-1", true, null));
    service.ingest(email("m1"));

    assertThat(service.dismiss(userId, saved.get(0).getId()).getStatus()).isEqualTo(EmailHubStatus.APPLIED);
    assertThat(Optional.of(saved.get(0).getTargetId())).contains("task-1");
  }
}
