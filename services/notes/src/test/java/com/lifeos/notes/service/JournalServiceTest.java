package com.lifeos.notes.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.lifeos.notes.domains.dto.request.CreateNoteRequest;
import com.lifeos.notes.domains.dto.request.SaveJournalEntryRequest;
import com.lifeos.notes.domains.dto.request.SaveJournalEntryRequest.LinkInput;
import com.lifeos.notes.domains.dto.request.SaveJournalEntryRequest.PromptAnswerInput;
import com.lifeos.notes.domains.dto.request.UpdateNoteRequest;
import com.lifeos.notes.domains.dto.response.JournalEntryResponse;
import com.lifeos.notes.domains.dto.response.JournalInsightsResponse;
import com.lifeos.notes.domains.dto.response.NoteResponse;
import com.lifeos.notes.domains.entity.JournalEntry;
import com.lifeos.notes.domains.entity.Note;
import com.lifeos.notes.domains.entity.NoteModuleLink;
import com.lifeos.notes.domains.enums.NoteModuleType;
import com.lifeos.notes.domains.enums.NoteType;
import com.lifeos.notes.exception.NoteNotFoundException;
import com.lifeos.notes.exception.NoteValidationException;
import com.lifeos.notes.repository.JournalEntryRepository;
import com.lifeos.notes.repository.NoteModuleLinkRepository;
import com.lifeos.notes.repository.NoteRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class JournalServiceTest {

  @Mock private NoteService noteService;
  @Mock private NoteModuleLinkService noteModuleLinkService;
  @Mock private NoteRepository noteRepository;
  @Mock private JournalEntryRepository journalRepository;
  @Mock private NoteModuleLinkRepository moduleLinkRepository;

  private JournalService service;

  private final UUID userId = UUID.randomUUID();
  private final UUID goalId = UUID.randomUUID();
  private final Map<UUID, Note> notes = new java.util.HashMap<>();
  private final Map<UUID, JournalEntry> journals = new java.util.HashMap<>();

  @BeforeEach
  void setUp() {
    service = new JournalService(noteService, noteModuleLinkService, noteRepository, journalRepository, moduleLinkRepository);

    when(noteService.create(eq(userId), any(CreateNoteRequest.class)))
        .thenAnswer(
            inv -> {
              CreateNoteRequest req = inv.getArgument(1);
              Note note =
                  Note.builder()
                      .id(UUID.randomUUID())
                      .userId(userId)
                      .title(req.getTitle())
                      .content(req.getContent())
                      .contentPlainText(req.getContent().replaceAll("<[^>]+>", " ").trim())
                      .noteType(req.getNoteType())
                      .createdAt(Instant.now())
                      .updatedAt(Instant.now())
                      .build();
              notes.put(note.getId(), note);
              return NoteResponse.builder().id(note.getId()).build();
            });
    when(noteRepository.findByIdAndUserIdAndDeletedAtIsNull(any(), eq(userId))).thenAnswer(inv -> Optional.ofNullable(notes.get(inv.<UUID>getArgument(0))));
    when(noteRepository.findAllByUserIdAndNoteTypeAndDeletedAtIsNull(userId, NoteType.JOURNAL)).thenAnswer(inv -> new ArrayList<>(notes.values()));
    when(journalRepository.save(any())).thenAnswer(
        inv -> {
          JournalEntry j = inv.getArgument(0);
          journals.put(j.getNoteId(), j);
          return j;
        });
    when(journalRepository.findById(any())).thenAnswer(inv -> Optional.ofNullable(journals.get(inv.<UUID>getArgument(0))));
    when(journalRepository.findAllById(any())).thenAnswer(inv -> journals.values().stream().toList());
    when(moduleLinkRepository.findAllByNoteId(any())).thenReturn(List.of());
    when(moduleLinkRepository.findAllByNoteIdIn(any())).thenReturn(List.of());
  }

  private SaveJournalEntryRequest request(String title, LocalDate date, Integer mood, Integer energy, String freeWriting, List<PromptAnswerInput> prompts, List<LinkInput> links) {
    return new SaveJournalEntryRequest(title, date, mood, energy, freeWriting, prompts, links);
  }

  private JournalEntryResponse createEntry(LocalDate date, Integer mood, Integer energy, String text) {
    return service.create(userId, request(null, date, mood, energy, text, List.of(), List.of()));
  }

  @Test
  void createMakesAJournalTypedNoteTaggedJournalWithRenderedContent() {
    JournalEntryResponse response =
        service.create(
            userId,
            request("  ", LocalDate.of(2026, 9, 30), 4, 3, "Good day.", List.of(new PromptAnswerInput("Grateful for?", "Coffee"), new PromptAnswerInput("Skipped?", "  ")), List.of(new LinkInput(NoteModuleType.GOAL, goalId))));

    ArgumentCaptor<CreateNoteRequest> captor = ArgumentCaptor.forClass(CreateNoteRequest.class);
    verify(noteService).create(eq(userId), captor.capture());
    CreateNoteRequest note = captor.getValue();
    assertThat(note.getNoteType()).isEqualTo(NoteType.JOURNAL);
    assertThat(note.getTags()).containsExactly("journal");
    assertThat(note.getTitle()).isEqualTo("Journal - Wed, Sep 30, 2026");
    assertThat(note.getContent()).isEqualTo("<h3>Grateful for?</h3><p>Coffee</p><h3>Free writing</h3><p>Good day.</p>");
    assertThat(note.getModuleLinks()).hasSize(1);
    assertThat(note.getModuleLinks().get(0).getModuleId()).isEqualTo(goalId);

    assertThat(response.mood()).isEqualTo(4);
    assertThat(response.prompts()).extracting(JournalEntryResponse.PromptAnswer::prompt).containsExactly("Grateful for?");
    assertThat(response.entryDate()).isEqualTo(LocalDate.of(2026, 9, 30));
  }

  @Test
  void anExplicitTitleIsKept() {
    service.create(userId, request(" My big day ", null, 5, null, "x", List.of(), List.of()));

    ArgumentCaptor<CreateNoteRequest> captor = ArgumentCaptor.forClass(CreateNoteRequest.class);
    verify(noteService).create(eq(userId), captor.capture());
    assertThat(captor.getValue().getTitle()).isEqualTo("My big day");
  }

  @Test
  void aMoodAloneIsEnoughForAnEntryButNothingAtAllIsNot() {
    assertThat(createEntry(null, 3, null, null).mood()).isEqualTo(3);

    assertThatThrownBy(() -> createEntry(null, null, null, "  ")).isInstanceOf(NoteValidationException.class);
    assertThatThrownBy(() -> service.create(userId, request(null, null, null, null, null, List.of(new PromptAnswerInput("Q", " ")), List.of()))).isInstanceOf(NoteValidationException.class);
  }

  @Test
  void anEntryCannotBeDatedInTheFuture() {
    assertThatThrownBy(() -> createEntry(LocalDate.now().plusDays(1), 3, null, "x")).isInstanceOf(NoteValidationException.class);
  }

  @Test
  void onlyGoalsAndProjectsCanBeLinked() {
    assertThatThrownBy(() -> service.create(userId, request(null, null, 3, null, "x", List.of(), List.of(new LinkInput(NoteModuleType.TASK, UUID.randomUUID())))))
        .isInstanceOf(NoteValidationException.class);
    verify(noteService, never()).create(any(), any());
  }

  @Test
  void updateRewritesTheNoteAndTheJournalRowAndSyncsLinksToExactlyWhatWasSent() {
    JournalEntryResponse created = service.create(userId, request(null, LocalDate.of(2026, 9, 1), 2, 2, "old", List.of(), List.of()));
    UUID noteId = created.noteId();
    UUID keepGoal = UUID.randomUUID();
    UUID dropGoal = UUID.randomUUID();
    UUID newProject = UUID.randomUUID();
    NoteModuleLink keep = NoteModuleLink.builder().id(UUID.randomUUID()).noteId(noteId).moduleType(NoteModuleType.GOAL).moduleId(keepGoal).build();
    NoteModuleLink drop = NoteModuleLink.builder().id(UUID.randomUUID()).noteId(noteId).moduleType(NoteModuleType.GOAL).moduleId(dropGoal).build();
    NoteModuleLink unrelated = NoteModuleLink.builder().id(UUID.randomUUID()).noteId(noteId).moduleType(NoteModuleType.TASK).moduleId(UUID.randomUUID()).build();
    when(moduleLinkRepository.findAllByNoteId(noteId)).thenReturn(List.of(keep, drop, unrelated));

    service.update(userId, noteId, request("Renamed", LocalDate.of(2026, 9, 2), 5, null, "new text", List.of(),
        List.of(new LinkInput(NoteModuleType.GOAL, keepGoal), new LinkInput(NoteModuleType.PROJECT, newProject))));

    ArgumentCaptor<UpdateNoteRequest> captor = ArgumentCaptor.forClass(UpdateNoteRequest.class);
    verify(noteService).update(eq(userId), eq(noteId), captor.capture());
    assertThat(captor.getValue().getTitle()).isEqualTo("Renamed");
    assertThat(captor.getValue().getContent()).isEqualTo("<p>new text</p>");

    JournalEntry stored = journals.get(noteId);
    assertThat(stored.getEntryDate()).isEqualTo(LocalDate.of(2026, 9, 2));
    assertThat(stored.getMood()).isEqualTo(5);
    assertThat(stored.getEnergy()).isNull();

    verify(noteModuleLinkService).removeLink(userId, noteId, drop.getId());
    verify(noteModuleLinkService, never()).removeLink(userId, noteId, keep.getId());
    verify(noteModuleLinkService, never()).removeLink(userId, noteId, unrelated.getId());
    verify(noteModuleLinkService).addLink(userId, noteId, NoteModuleType.PROJECT, newProject);
    verify(noteModuleLinkService, never()).addLink(userId, noteId, NoteModuleType.GOAL, keepGoal);
  }

  @Test
  void aNoteThatIsNotAJournalEntryOrNotYoursIsNotFound() {
    Note general = Note.builder().id(UUID.randomUUID()).userId(userId).noteType(NoteType.GENERAL).build();
    notes.put(general.getId(), general);

    assertThatThrownBy(() -> service.get(userId, general.getId())).isInstanceOf(NoteNotFoundException.class);
    assertThatThrownBy(() -> service.delete(userId, general.getId())).isInstanceOf(NoteNotFoundException.class);
    assertThatThrownBy(() -> service.update(userId, UUID.randomUUID(), request(null, null, 3, null, "x", List.of(), List.of()))).isInstanceOf(NoteNotFoundException.class);
  }

  @Test
  void deleteSoftDeletesTheUnderlyingNote() {
    UUID noteId = createEntry(null, 3, null, "bye").noteId();

    service.delete(userId, noteId);

    verify(noteService).softDelete(userId, noteId);
  }

  @Test
  void listFiltersByDateRangeMoodAndTextAndSortsNewestFirst() {
    createEntry(LocalDate.of(2026, 9, 1), 2, 2, "rainy morning");
    createEntry(LocalDate.of(2026, 9, 10), 4, 4, "sunny walk");
    createEntry(LocalDate.of(2026, 9, 20), 4, 5, "big launch day");

    assertThat(service.list(userId, null, null, null, null)).extracting(JournalEntryResponse::entryDate)
        .containsExactly(LocalDate.of(2026, 9, 20), LocalDate.of(2026, 9, 10), LocalDate.of(2026, 9, 1));
    assertThat(service.list(userId, LocalDate.of(2026, 9, 5), LocalDate.of(2026, 9, 15), null, null)).hasSize(1);
    assertThat(service.list(userId, null, null, 4, null)).hasSize(2);
    assertThat(service.list(userId, null, null, null, "LAUNCH")).extracting(JournalEntryResponse::entryDate).containsExactly(LocalDate.of(2026, 9, 20));
  }

  @Test
  void insightsAverageMoodAndEnergyPerDayAndIgnoreMissingValues() {
    LocalDate today = LocalDate.now();
    createEntry(today, 4, null, "morning");
    createEntry(today, 2, 3, "evening");
    createEntry(today.minusDays(1), null, 5, "yesterday");
    createEntry(today.minusDays(60), 1, 1, "way back");

    JournalInsightsResponse insights = service.insights(userId, today.minusDays(6), today);

    assertThat(insights.totalEntries()).isEqualTo(3);
    assertThat(insights.days()).hasSize(2);
    var todayPoint = insights.days().get(1);
    assertThat(todayPoint.date()).isEqualTo(today);
    assertThat(todayPoint.mood()).isEqualTo(3.0);
    assertThat(todayPoint.energy()).isEqualTo(3.0);
    assertThat(todayPoint.entries()).isEqualTo(2);
    assertThat(insights.days().get(0).mood()).isNull();
    assertThat(insights.averageMood()).isEqualTo(3.0);
    assertThat(insights.averageEnergy()).isEqualTo(4.0);
    assertThat(insights.currentStreakDays()).isEqualTo(2);
  }
}
