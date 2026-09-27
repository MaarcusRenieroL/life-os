package com.lifeos.notes.scheduler;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.lifeos.common.events.NotificationEventPublisher;
import com.lifeos.common.events.NotificationEventType;
import com.lifeos.notes.domains.entity.Note;
import com.lifeos.notes.repository.NoteRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class NoteFollowUpScannerTest {

  @Mock private NoteRepository noteRepository;
  @Mock private NotificationEventPublisher notificationEventPublisher;
  @InjectMocks private NoteFollowUpScanner scanner;

  @Test
  void publishesFollowUpDueNotificationForEachNoteDueToday() {
    UUID userId = UUID.randomUUID();
    Note note =
        Note.builder()
            .id(UUID.randomUUID())
            .userId(userId)
            .title("Prep interview notes")
            .description("Before the call")
            .followUpAt(Instant.now())
            .build();

    when(noteRepository.findAllByFollowUpAtGreaterThanEqualAndFollowUpAtLessThanAndDeletedAtIsNull(
            any(Instant.class), any(Instant.class)))
        .thenReturn(List.of(note));

    scanner.notifyDueFollowUps();

    ArgumentCaptor<String> titleCaptor = ArgumentCaptor.forClass(String.class);
    verify(notificationEventPublisher)
        .publish(
            eq(userId),
            eq(NotificationEventType.NOTE_FOLLOWUP_DUE),
            titleCaptor.capture(),
            eq(note.getDescription()),
            anyMap());
    org.assertj.core.api.Assertions.assertThat(titleCaptor.getValue()).contains(note.getTitle());
  }

  @Test
  void noDueNotesPublishesNothing() {
    when(noteRepository.findAllByFollowUpAtGreaterThanEqualAndFollowUpAtLessThanAndDeletedAtIsNull(
            any(Instant.class), any(Instant.class)))
        .thenReturn(List.of());

    scanner.notifyDueFollowUps();

    verify(notificationEventPublisher, never())
        .publish(any(), any(NotificationEventType.class), any(), any(), anyMap());
  }
}
