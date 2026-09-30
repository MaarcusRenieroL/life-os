package com.lifeos.notes.service;

import com.lifeos.notes.domains.dto.request.CreateNoteModuleLinkRequest;
import com.lifeos.notes.domains.dto.request.CreateNoteRequest;
import com.lifeos.notes.domains.dto.request.SaveJournalEntryRequest;
import com.lifeos.notes.domains.dto.request.UpdateNoteRequest;
import com.lifeos.notes.domains.dto.response.JournalEntryResponse;
import com.lifeos.notes.domains.dto.response.JournalInsightsResponse;
import com.lifeos.notes.domains.dto.response.NoteModuleLinkResponse;
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
import com.lifeos.notes.util.NoteContentUtil;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Journal entries on top of notes: an entry IS a note (noteType JOURNAL, tagged "journal", so
 * every generic notes feature - search, export, the graph, trash, the tag filter - just works),
 * plus a journal_entries row holding the date, mood, energy and the structured prompt answers the
 * note's content is rendered from. All the note plumbing (versions, tags, caching) goes through
 * NoteService rather than being re-implemented here. */
@Service
@RequiredArgsConstructor
@Transactional
public class JournalService {

  static final String JOURNAL_TAG = "journal";
  private static final Set<NoteModuleType> LINKABLE = Set.of(NoteModuleType.GOAL, NoteModuleType.PROJECT);
  private static final DateTimeFormatter TITLE_FORMAT = DateTimeFormatter.ofPattern("EEE, MMM d, yyyy", Locale.ENGLISH);

  private final NoteService noteService;
  private final NoteModuleLinkService noteModuleLinkService;
  private final NoteRepository noteRepository;
  private final JournalEntryRepository journalRepository;
  private final NoteModuleLinkRepository moduleLinkRepository;

  public JournalEntryResponse create(UUID userId, SaveJournalEntryRequest request) {
    Normalized entry = normalize(request);

    NoteResponse note =
        noteService.create(
            userId,
            CreateNoteRequest.builder()
                .title(titleFor(request.title(), entry.date()))
                .content(entry.content())
                .noteType(NoteType.JOURNAL)
                .tags(List.of(JOURNAL_TAG))
                .moduleLinks(entry.links().stream().map(l -> new CreateNoteModuleLinkRequest(l.moduleType(), l.moduleId())).toList())
                .build());

    journalRepository.save(
        JournalEntry.builder()
            .noteId(note.getId())
            .entryDate(entry.date())
            .mood(request.mood())
            .energy(request.energy())
            .freeWriting(entry.freeWriting())
            .promptAnswers(entry.prompts())
            .build());
    return get(userId, note.getId());
  }

  public JournalEntryResponse update(UUID userId, UUID noteId, SaveJournalEntryRequest request) {
    Note note = requireJournalNote(userId, noteId);
    JournalEntry journal = journalRepository.findById(noteId).orElseThrow(() -> new NoteNotFoundException(noteId));
    Normalized entry = normalize(request);

    noteService.update(userId, noteId, UpdateNoteRequest.builder().title(titleFor(request.title(), entry.date())).content(entry.content()).build());

    journal.setEntryDate(entry.date());
    journal.setMood(request.mood());
    journal.setEnergy(request.energy());
    journal.setFreeWriting(entry.freeWriting());
    journal.setPromptAnswers(entry.prompts());
    journalRepository.save(journal);

    syncLinks(userId, note.getId(), entry.links());
    return get(userId, noteId);
  }

  /** Soft-deletes the underlying note, so an entry lands in the notes trash and can be restored
   * from there like any other note. */
  public void delete(UUID userId, UUID noteId) {
    requireJournalNote(userId, noteId);
    noteService.softDelete(userId, noteId);
  }

  @Transactional(readOnly = true)
  public JournalEntryResponse get(UUID userId, UUID noteId) {
    Note note = requireJournalNote(userId, noteId);
    JournalEntry journal = journalRepository.findById(noteId).orElseThrow(() -> new NoteNotFoundException(noteId));
    return toResponse(note, journal, moduleLinkRepository.findAllByNoteId(noteId));
  }

  @Transactional(readOnly = true)
  public List<JournalEntryResponse> list(UUID userId, LocalDate from, LocalDate to, Integer mood, String q) {
    List<Note> notes = noteRepository.findAllByUserIdAndNoteTypeAndDeletedAtIsNull(userId, NoteType.JOURNAL);
    if (notes.isEmpty()) return List.of();

    Map<UUID, JournalEntry> journals = journalRepository.findAllById(notes.stream().map(Note::getId).toList()).stream().collect(Collectors.toMap(JournalEntry::getNoteId, j -> j));
    Map<UUID, List<NoteModuleLink>> links =
        moduleLinkRepository.findAllByNoteIdIn(notes.stream().map(Note::getId).toList()).stream().collect(Collectors.groupingBy(NoteModuleLink::getNoteId));
    String needle = q == null || q.isBlank() ? null : q.trim().toLowerCase();

    return notes.stream()
        .filter(n -> journals.containsKey(n.getId()))
        .filter(n -> from == null || !journals.get(n.getId()).getEntryDate().isBefore(from))
        .filter(n -> to == null || !journals.get(n.getId()).getEntryDate().isAfter(to))
        .filter(n -> mood == null || mood.equals(journals.get(n.getId()).getMood()))
        .filter(
            n ->
                needle == null
                    || n.getTitle().toLowerCase().contains(needle)
                    || (n.getContentPlainText() != null && n.getContentPlainText().toLowerCase().contains(needle)))
        .map(n -> toResponse(n, journals.get(n.getId()), links.getOrDefault(n.getId(), List.of())))
        .sorted(Comparator.comparing(JournalEntryResponse::entryDate).thenComparing(JournalEntryResponse::createdAt).reversed())
        .toList();
  }

  @Transactional(readOnly = true)
  public JournalInsightsResponse insights(UUID userId, LocalDate from, LocalDate to) {
    LocalDate today = LocalDate.now();
    LocalDate end = to == null ? today : to;
    LocalDate start = from == null ? end.minusDays(29) : from;

    List<Note> notes = noteRepository.findAllByUserIdAndNoteTypeAndDeletedAtIsNull(userId, NoteType.JOURNAL);
    List<JournalEntry> all = journalRepository.findAllById(notes.stream().map(Note::getId).toList());
    List<JournalEntry> inRange = all.stream().filter(j -> !j.getEntryDate().isBefore(start) && !j.getEntryDate().isAfter(end)).toList();

    List<JournalInsightsResponse.DailyPoint> days =
        inRange.stream()
            .collect(Collectors.groupingBy(JournalEntry::getEntryDate))
            .entrySet()
            .stream()
            .sorted(Map.Entry.comparingByKey())
            .map(e -> new JournalInsightsResponse.DailyPoint(e.getKey(), average(e.getValue().stream().map(JournalEntry::getMood)), average(e.getValue().stream().map(JournalEntry::getEnergy)), e.getValue().size()))
            .toList();

    JournalStreakCalculator.Streaks streaks = JournalStreakCalculator.calculate(all.stream().map(JournalEntry::getEntryDate).toList(), today);
    return new JournalInsightsResponse(
        inRange.size(),
        average(inRange.stream().map(JournalEntry::getMood)),
        average(inRange.stream().map(JournalEntry::getEnergy)),
        streaks.current(),
        streaks.longest(),
        days);
  }

  // ---- helpers ----

  /** The request cleaned up and validated, plus everything derived from it. */
  private record Normalized(LocalDate date, String freeWriting, List<Map<String, String>> prompts, String content, List<SaveJournalEntryRequest.LinkInput> links) {}

  private Normalized normalize(SaveJournalEntryRequest request) {
    LocalDate date = request.entryDate() == null ? LocalDate.now() : request.entryDate();
    if (date.isAfter(LocalDate.now())) throw new NoteValidationException("A journal entry can't be dated in the future");

    List<Map<String, String>> prompts = new ArrayList<>();
    if (request.prompts() != null) {
      for (SaveJournalEntryRequest.PromptAnswerInput input : request.prompts()) {
        // A prompt the user opened but never answered isn't worth keeping.
        if (input.answer() == null || input.answer().isBlank()) continue;
        prompts.add(Map.of("prompt", input.prompt().trim(), "answer", input.answer().strip()));
      }
    }
    String freeWriting = request.freeWriting() == null || request.freeWriting().isBlank() ? null : request.freeWriting().strip();

    if (prompts.isEmpty() && freeWriting == null && request.mood() == null && request.energy() == null) {
      throw new NoteValidationException("Write something, answer a prompt, or pick a mood");
    }

    List<SaveJournalEntryRequest.LinkInput> links = request.links() == null ? List.of() : request.links().stream().distinct().toList();
    for (SaveJournalEntryRequest.LinkInput link : links) {
      if (!LINKABLE.contains(link.moduleType())) throw new NoteValidationException("A journal entry can only link to goals or projects");
    }

    return new Normalized(date, freeWriting, prompts, JournalContentBuilder.build(prompts, freeWriting), links);
  }

  /** Makes the note's goal/project links match exactly what the form sent. */
  private void syncLinks(UUID userId, UUID noteId, List<SaveJournalEntryRequest.LinkInput> wanted) {
    List<NoteModuleLink> existing = moduleLinkRepository.findAllByNoteId(noteId).stream().filter(l -> LINKABLE.contains(l.getModuleType())).toList();

    for (NoteModuleLink link : existing) {
      boolean stillWanted = wanted.stream().anyMatch(w -> w.moduleType() == link.getModuleType() && w.moduleId().equals(link.getModuleId()));
      if (!stillWanted) noteModuleLinkService.removeLink(userId, noteId, link.getId());
    }
    for (SaveJournalEntryRequest.LinkInput link : wanted) {
      boolean present = existing.stream().anyMatch(e -> e.getModuleType() == link.moduleType() && e.getModuleId().equals(link.moduleId()));
      if (!present) noteModuleLinkService.addLink(userId, noteId, link.moduleType(), link.moduleId());
    }
  }

  private Note requireJournalNote(UUID userId, UUID noteId) {
    return noteRepository
        .findByIdAndUserIdAndDeletedAtIsNull(noteId, userId)
        .filter(n -> n.getNoteType() == NoteType.JOURNAL)
        .orElseThrow(() -> new NoteNotFoundException(noteId));
  }

  private static String titleFor(String title, LocalDate date) {
    return title == null || title.isBlank() ? "Journal - " + date.format(TITLE_FORMAT) : title.trim();
  }

  private static Double average(java.util.stream.Stream<Integer> values) {
    var present = values.filter(Objects::nonNull).toList();
    if (present.isEmpty()) return null;
    return Math.round(present.stream().mapToInt(Integer::intValue).average().orElse(0) * 10) / 10.0;
  }

  private JournalEntryResponse toResponse(Note note, JournalEntry journal, List<NoteModuleLink> links) {
    return new JournalEntryResponse(
        note.getId(),
        note.getTitle(),
        journal.getEntryDate(),
        journal.getMood(),
        journal.getEnergy(),
        journal.getFreeWriting(),
        (journal.getPromptAnswers() == null ? List.<Map<String, String>>of() : journal.getPromptAnswers()).stream()
            .map(p -> new JournalEntryResponse.PromptAnswer(p.get("prompt"), p.get("answer")))
            .toList(),
        NoteContentUtil.excerpt(note.getContentPlainText(), 180),
        links.stream()
            .map(l -> NoteModuleLinkResponse.builder().id(l.getId()).moduleType(l.getModuleType()).moduleId(l.getModuleId()).createdAt(l.getCreatedAt()).build())
            .toList(),
        note.getCreatedAt(),
        note.getUpdatedAt());
  }
}
