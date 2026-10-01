package com.lifeos.notes.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.lifeos.common.domains.dto.response.TodayItemResponse;
import com.lifeos.notes.domains.entity.Note;
import com.lifeos.notes.repository.NoteRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class NoteServiceTodayTest {

  @Mock private NoteRepository noteRepository;
  @InjectMocks private NoteService noteService;

  private final UUID userId = UUID.randomUUID();

  @Test
  void overdueFollowUpIsReportedAsUrgent() {
    Note note =
        Note.builder()
            .id(UUID.randomUUID())
            .userId(userId)
            .title("Renew passport")
            .description("Expires soon")
            .followUpAt(Instant.now().minus(2, ChronoUnit.DAYS))
            .build();

    when(noteRepository.findAllByUserIdAndFollowUpAtIsNotNullAndFollowUpAtLessThanAndDeletedAtIsNull(
            eq(userId), any(Instant.class)))
        .thenReturn(List.of(note));

    List<TodayItemResponse> result = noteService.todayFollowUps(userId);

    assertThat(result).hasSize(1);
    TodayItemResponse item = result.get(0);
    assertThat(item.getModule()).isEqualTo("notes");
    assertThat(item.getType()).isEqualTo("note_followup");
    assertThat(item.getTitle()).isEqualTo("Renew passport");
    assertThat(item.getEntityId()).isEqualTo(note.getId().toString());
    assertThat(item.getPriority()).isEqualTo("urgent");
  }

  @Test
  void followUpDueLaterTodayIsReportedAsWarning() {
    Note note =
        Note.builder()
            .id(UUID.randomUUID())
            .userId(userId)
            .title("Call dentist")
            .followUpAt(Instant.now().plus(2, ChronoUnit.HOURS))
            .build();

    when(noteRepository.findAllByUserIdAndFollowUpAtIsNotNullAndFollowUpAtLessThanAndDeletedAtIsNull(
            eq(userId), any(Instant.class)))
        .thenReturn(List.of(note));

    List<TodayItemResponse> result = noteService.todayFollowUps(userId);

    assertThat(result).hasSize(1);
    assertThat(result.get(0).getPriority()).isEqualTo("warning");
  }

  @Test
  void noFollowUpsReturnsEmptyList() {
    when(noteRepository.findAllByUserIdAndFollowUpAtIsNotNullAndFollowUpAtLessThanAndDeletedAtIsNull(
            eq(userId), any(Instant.class)))
        .thenReturn(List.of());

    assertThat(noteService.todayFollowUps(userId)).isEmpty();
  }
}
