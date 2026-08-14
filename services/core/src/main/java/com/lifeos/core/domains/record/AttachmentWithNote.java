package com.lifeos.core.domains.record;

import java.time.Instant;
import java.util.UUID;

// Projection for the global (cross-note) attachments list - a plain
// NoteAttachment doesn't carry the parent note's title, and that's the one
// piece of context the Attachments page needs that a per-note fetch already
// has for free.
public record AttachmentWithNote(
    UUID id,
    String fileName,
    long fileSize,
    String fileType,
    Instant uploadDate,
    UUID noteId,
    String noteTitle) {}
