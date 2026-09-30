package com.lifeos.notes.domains.dto.request;

import com.lifeos.notes.domains.enums.NoteModuleType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Create and update share this - update replaces every field (a null mood really means "no
 * mood"), so the client always sends the whole form. title is optional: blank falls back to the
 * entry's date. */
public record SaveJournalEntryRequest(
    @Size(max = 500) String title,
    LocalDate entryDate,
    @Min(1) @Max(5) Integer mood,
    @Min(1) @Max(5) Integer energy,
    @Size(max = 50000) String freeWriting,
    @Valid @Size(max = 20) List<PromptAnswerInput> prompts,
    @Valid @Size(max = 20) List<LinkInput> links) {

  public record PromptAnswerInput(@NotBlank @Size(max = 500) String prompt, @Size(max = 20000) String answer) {}

  /** A journal entry can link to goals and projects only. */
  public record LinkInput(@NotNull NoteModuleType moduleType, @NotNull UUID moduleId) {}
}
