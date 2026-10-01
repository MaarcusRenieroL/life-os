package com.lifeos.notes.scheduler;

import com.lifeos.common.events.NotificationEventPublisher;
import com.lifeos.common.events.NotificationEventType;
import com.lifeos.notes.domains.entity.Note;
import com.lifeos.notes.repository.NoteRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Runs once a day and publishes {@code NOTE_FOLLOWUP_DUE} for every note whose {@code
 * followUpAt} falls exactly within today's calendar day (server default zone).
 *
 * <p>Dedup strategy: this scans an exact "is it today" window ({@code [startOfToday,
 * startOfTomorrow)}), not an open-ended "due or overdue" range - a note's {@code followUpAt} is
 * only ever inside that window on the one calendar day it lands on, so a daily run can never see
 * the same note qualify twice. This is deliberately simpler than tracking a
 * "already notified" flag: no extra column, no risk of it getting out of sync, at the cost of a
 * note missing its notification entirely if the scanner is down for a whole day - an acceptable
 * trade-off for a non-critical reminder. (The internal /today endpoint separately surfaces
 * overdue follow-ups, so a missed notification isn't the note's only way to resurface.)
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class NoteFollowUpScanner {

  private final NoteRepository noteRepository;
  private final NotificationEventPublisher notificationEventPublisher;

  @Scheduled(cron = "${notes.follow-up.scan.cron:0 0 8 * * *}")
  @Transactional(readOnly = true)
  public void notifyDueFollowUps() {
    LocalDate today = LocalDate.now(ZoneId.systemDefault());
    Instant startOfToday = today.atStartOfDay(ZoneId.systemDefault()).toInstant();
    Instant startOfTomorrow = today.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant();

    List<Note> dueToday =
        noteRepository.findAllByFollowUpAtGreaterThanEqualAndFollowUpAtLessThanAndDeletedAtIsNull(
            startOfToday, startOfTomorrow);

    for (Note note : dueToday) {
      notificationEventPublisher.publish(
          note.getUserId(),
          NotificationEventType.NOTE_FOLLOWUP_DUE,
          "Follow up: " + note.getTitle(),
          note.getDescription(),
          Map.of("noteId", note.getId().toString()));
    }

    if (!dueToday.isEmpty()) {
      log.info("Published {} note follow-up notifications due today", dueToday.size());
    }
  }
}
