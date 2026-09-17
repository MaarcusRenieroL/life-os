package com.lifeos.notes.scheduler;

import com.lifeos.notes.domains.entity.Note;
import com.lifeos.notes.domains.entity.NoteUserSettings;
import com.lifeos.notes.repository.NoteRepository;
import com.lifeos.notes.repository.NoteUserSettingsRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

// Runs the two background jobs the Notes Settings page's "Auto-archive" and
// "Trash" sections describe. Both are daily sweeps - notes data doesn't need
// anything finer-grained, and a fixed off-peak hour keeps them from
// competing with interactive traffic.
@Component
@RequiredArgsConstructor
@Slf4j
public class NoteMaintenanceScheduler {

  private static final int TRASH_RETENTION_DAYS = 30;

  private final NoteRepository noteRepository;
  private final NoteUserSettingsRepository noteUserSettingsRepository;

  // 03:15 local server time - matches the batches service's existing backup
  // job's off-peak convention (BACKUP_CRON defaults to 3am).
  @Scheduled(cron = "0 15 3 * * *")
  @Transactional
  public void purgeTrash() {
    Instant cutoff = Instant.now().minus(TRASH_RETENTION_DAYS, ChronoUnit.DAYS);
    List<Note> expired = noteRepository.findAllByDeletedAtBefore(cutoff);

    if (expired.isEmpty()) {
      return;
    }

    noteRepository.deleteAll(expired);
    log.info("Purged {} notes from trash (past {}-day retention)", expired.size(), TRASH_RETENTION_DAYS);
  }

  @Scheduled(cron = "0 30 3 * * *")
  @Transactional
  public void autoArchiveInactiveNotes() {
    List<NoteUserSettings> enabledUsers = noteUserSettingsRepository.findAllByAutoArchiveEnabledTrue();
    int archivedTotal = 0;

    for (NoteUserSettings settings : enabledUsers) {
      Instant cutoff = Instant.now().minus(settings.getAutoArchiveDays(), ChronoUnit.DAYS);
      List<Note> stale =
          noteRepository.findAllByUserIdAndIsArchivedFalseAndDeletedAtIsNullAndUpdatedAtBefore(
              settings.getUserId(), cutoff);

      for (Note note : stale) {
        note.setArchived(true);
      }
      noteRepository.saveAll(stale);
      archivedTotal += stale.size();
    }

    if (archivedTotal > 0) {
      log.info("Auto-archived {} inactive notes across {} users", archivedTotal, enabledUsers.size());
    }
  }
}
