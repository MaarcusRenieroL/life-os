package com.lifeos.core.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.lifeos.core.domains.record.EmailAction;
import com.lifeos.core.domains.record.QuickCaptureClassification;
import com.lifeos.core.domains.record.QuickCaptureClassification.EventCapture;
import com.lifeos.core.domains.record.QuickCaptureClassification.TaskCapture;
import com.lifeos.core.domains.record.QuickCaptureResult;
import com.lifeos.core.integration.QuickCaptureAiClient;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.web.client.RestClient;

class QuickCaptureServiceTest {

  private final QuickCaptureAiClient ai = mock(QuickCaptureAiClient.class);
  private final EmailActionExecutor executor = mock(EmailActionExecutor.class);
  private final QuickCaptureService service =
      new QuickCaptureService(ai, mock(RestClient.class), mock(RestClient.class), mock(RestClient.class), executor, "key");
  private final UUID user = UUID.randomUUID();

  private void classifiedAs(QuickCaptureClassification classification) {
    when(ai.classifyWithOllama(any())).thenReturn(classification);
  }

  @Test
  void somethingToDoBecomesATaskWithItsDeadline() {
    classifiedAs(new QuickCaptureClassification("task", null, null, null, new TaskCapture("Renew passport", "2026-10-09", null, "high"), null));

    QuickCaptureResult result = service.capture(user, "renew passport by friday", false);

    ArgumentCaptor<EmailAction> action = ArgumentCaptor.forClass(EmailAction.class);
    verify(executor).execute(eq(user), action.capture());
    assertThat(action.getValue().kind()).isEqualTo("TASK");
    assertThat(action.getValue().dueDate()).isEqualTo(LocalDate.of(2026, 10, 9));
    assertThat(action.getValue().priority()).isEqualTo("HIGH");
    assertThat(result.module()).isEqualTo("task");
  }

  @Test
  void aTimedEventIsPlacedInIstAndRunsAnHourByDefault() {
    classifiedAs(new QuickCaptureClassification("event", null, null, null, null, new EventCapture("Dentist", "2026-10-05", "17:00", null, null)));

    service.capture(user, "dentist monday 5pm", false);

    ArgumentCaptor<EmailAction> action = ArgumentCaptor.forClass(EmailAction.class);
    verify(executor).execute(eq(user), action.capture());
    assertThat(action.getValue().kind()).isEqualTo("EVENT");
    assertThat(action.getValue().allDay()).isFalse();
    assertThat(action.getValue().startAt()).isEqualTo(Instant.parse("2026-10-05T11:30:00Z"));
    assertThat(action.getValue().endAt()).isEqualTo(Instant.parse("2026-10-05T12:30:00Z"));
  }

  @Test
  void anEventWithoutADateIsKeptAsATaskRatherThanLost() {
    classifiedAs(new QuickCaptureClassification("event", null, null, null, null, new EventCapture("Team dinner", null, null, null, null)));

    QuickCaptureResult result = service.capture(user, "team dinner sometime", false);

    ArgumentCaptor<EmailAction> action = ArgumentCaptor.forClass(EmailAction.class);
    verify(executor).execute(eq(user), action.capture());
    assertThat(action.getValue().kind()).isEqualTo("TASK");
    assertThat(result.module()).isEqualTo("task");
  }
}
