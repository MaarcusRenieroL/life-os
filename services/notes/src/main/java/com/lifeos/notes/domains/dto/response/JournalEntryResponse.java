package com.lifeos.notes.domains.dto.response;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record JournalEntryResponse(
    UUID noteId,
    String title,
    LocalDate entryDate,
    Integer mood,
    Integer energy,
    String freeWriting,
    List<PromptAnswer> prompts,
    /** A short plain-text preview for the list view. */
    String excerpt,
    List<NoteModuleLinkResponse> links,
    Instant createdAt,
    Instant updatedAt) {

  public record PromptAnswer(String prompt, String answer) {}
}
