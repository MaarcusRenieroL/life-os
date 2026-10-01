package com.lifeos.calendar.service;

import com.lifeos.calendar.domains.dto.request.SetRecurrenceRequest;
import com.lifeos.calendar.domains.dto.response.EventResponse;
import com.lifeos.calendar.domains.entity.Event;
import com.lifeos.calendar.domains.enums.EventRecurrencePattern;
import com.lifeos.calendar.exception.InvalidRequestException;
import com.lifeos.calendar.repository.EventRepository;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Mirrors services/tasks' TaskRecurrenceService - see its javadoc for the overall model (a
 * "definition" is an ordinary row, its own start is the first occurrence; generated occurrences
 * point back via recurringParentId; a rolling 30-day horizon regenerated nightly rather than
 * materializing every future occurrence up front).
 *
 * <p>The one real difference from tasks: an event's "start" is either startDate (all-day) or
 * startAt (timed), never both, so occurrence generation has to preserve whichever one the
 * definition uses, plus its original duration (endDate - startDate in days, or endAt - startAt).
 */
@Service
@RequiredArgsConstructor
@Transactional
public class EventRecurrenceService {

  private static final Logger log = LoggerFactory.getLogger(EventRecurrenceService.class);
  private static final int GENERATION_HORIZON_DAYS = 30;
  private static final ZoneId ZONE = ZoneId.systemDefault();

  private final EventRepository eventRepository;
  private final EventService eventService;

  public EventResponse setRecurrence(UUID userId, UUID eventId, SetRecurrenceRequest request) {
    Event event = eventService.findOwned(userId, eventId);
    if (event.getRecurringParentId() != null) {
      throw new InvalidRequestException("Cannot make a generated occurrence itself recurring.");
    }
    // basisDate() (used throughout generation) requires startDate for an all-day event or
    // startAt for a timed one - reject up front rather than NPEing during the nightly sweep.
    // EventService.validateTimeFields already guarantees a well-formed event never gets INTO this
    // state going forward, but this still guards any row created before that fix.
    if (Boolean.TRUE.equals(event.getAllDay()) ? event.getStartDate() == null : event.getStartAt() == null) {
      throw new InvalidRequestException("Set a start date/time before making this event recurring.");
    }
    validateConfig(request.getPattern(), request.getConfig());

    event.setRecurrencePattern(request.getPattern());
    event.setRecurrenceConfig(request.getConfig());
    event.setRecurrenceEndDate(request.getEndDate());
    event.setRecurrencePaused(false);
    event.setRecurrenceSkippedDates(null);
    Event saved = eventRepository.save(event);

    deleteFutureOccurrences(saved.getId());
    generateOccurrences(saved);

    return eventService.toResponse(saved);
  }

  public void stopRecurrence(UUID userId, UUID eventId) {
    Event event = eventService.findOwned(userId, eventId);
    requireIsDefinition(event);
    event.setRecurrencePattern(null);
    event.setRecurrenceConfig(null);
    event.setRecurrenceEndDate(null);
    event.setRecurrenceSkippedDates(null);
    eventRepository.save(event);
    deleteFutureOccurrences(event.getId());
  }

  public EventResponse pause(UUID userId, UUID eventId) {
    Event event = eventService.findOwned(userId, eventId);
    requireIsDefinition(event);
    event.setRecurrencePaused(true);
    return eventService.toResponse(eventRepository.save(event));
  }

  public EventResponse resume(UUID userId, UUID eventId) {
    Event event = eventService.findOwned(userId, eventId);
    requireIsDefinition(event);
    event.setRecurrencePaused(false);
    Event saved = eventRepository.save(event);
    generateOccurrences(saved);
    return eventService.toResponse(saved);
  }

  public void skipOccurrence(UUID userId, UUID eventId, LocalDate occurrenceDate) {
    Event event = eventService.findOwned(userId, eventId);
    requireIsDefinition(event);

    List<LocalDate> skipped = new ArrayList<>(
        event.getRecurrenceSkippedDates() != null ? event.getRecurrenceSkippedDates() : List.of());
    if (!skipped.contains(occurrenceDate)) {
      skipped.add(occurrenceDate);
    }
    event.setRecurrenceSkippedDates(skipped);
    eventRepository.save(event);

    eventRepository.findAllByRecurringParentId(event.getId()).stream()
        .filter(occurrence -> occurrenceDate.equals(basisDate(occurrence)))
        .forEach(eventRepository::delete);
  }

  @Transactional(readOnly = true)
  public List<EventResponse> occurrences(UUID userId, UUID eventId) {
    Event event = eventService.findOwned(userId, eventId);
    requireIsDefinition(event);
    return eventRepository.findAllByRecurringParentId(event.getId()).stream()
        .filter(e -> e.getUserId().equals(userId))
        .sorted((a, b) -> basisDate(a).compareTo(basisDate(b)))
        .map(eventService::toResponse)
        .toList();
  }

  public void generateOccurrencesForAllDefinitions() {
    LocalDate horizon = LocalDate.now().plusDays(GENERATION_HORIZON_DAYS);
    for (Event definition : eventRepository.findAllByRecurrencePatternIsNotNullAndRecurringParentIdIsNull()) {
      if (Boolean.TRUE.equals(definition.getRecurrencePaused())) continue;
      // Isolate each definition: one malformed row (or any other unexpected failure) must not
      // abort generation - and roll back everything already generated earlier in this same
      // pass - for every other user's recurring events tonight.
      try {
        generateOccurrences(definition, horizon);
      } catch (Exception exception) {
        log.warn("Recurrence generation failed for event definition {}, skipping it ({})", definition.getId(), exception.getMessage());
      }
    }
  }

  private void generateOccurrences(Event definition) {
    generateOccurrences(definition, LocalDate.now().plusDays(GENERATION_HORIZON_DAYS));
  }

  private void generateOccurrences(Event definition, LocalDate horizon) {
    LocalDate basis = basisDate(definition);
    // Clamp to today - see TaskRecurrenceService's identical comment: a definition anchored long
    // in the past must not backfill every historical date between then and now.
    LocalDate cursor = basis.plusDays(1);
    LocalDate today = LocalDate.now();
    if (cursor.isBefore(today)) cursor = today;
    LocalDate endDate = definition.getRecurrenceEndDate();
    LocalDate effectiveHorizon = endDate != null && endDate.isBefore(horizon) ? endDate : horizon;
    if (cursor.isAfter(effectiveHorizon)) return;

    Set<LocalDate> existing =
        eventRepository.findAllByRecurringParentId(definition.getId()).stream()
            .map(this::basisDate)
            .collect(java.util.stream.Collectors.toSet());
    Set<LocalDate> skipped =
        definition.getRecurrenceSkippedDates() != null
            ? Set.copyOf(definition.getRecurrenceSkippedDates())
            : Set.of();

    List<Event> toCreate = new ArrayList<>();
    while (!cursor.isAfter(effectiveHorizon)) {
      if (matchesPattern(definition, basis, cursor) && !existing.contains(cursor) && !skipped.contains(cursor)) {
        toCreate.add(occurrenceFrom(definition, basis, cursor));
      }
      cursor = cursor.plusDays(1);
    }
    if (!toCreate.isEmpty()) {
      eventRepository.saveAll(toCreate);
    }
  }

  /** The date an occurrence (or the definition itself) is anchored on - startDate for an all-day
   * event, the local calendar date of startAt otherwise. */
  private LocalDate basisDate(Event event) {
    return Boolean.TRUE.equals(event.getAllDay())
        ? event.getStartDate()
        : event.getStartAt().atZone(ZONE).toLocalDate();
  }

  private boolean matchesPattern(Event definition, LocalDate basis, LocalDate date) {
    Map<String, Object> config = definition.getRecurrenceConfig();
    return switch (definition.getRecurrencePattern()) {
      case DAILY -> true;
      case WEEKLY -> {
        List<?> rawDays = config != null ? (List<?>) config.get("daysOfWeek") : null;
        if (rawDays == null || rawDays.isEmpty()) yield date.getDayOfWeek().getValue() == basis.getDayOfWeek().getValue();
        yield rawDays.stream().anyMatch(d -> ((Number) d).intValue() == date.getDayOfWeek().getValue());
      }
      case MONTHLY -> {
        Integer dayOfMonth = config != null && config.get("dayOfMonth") != null
            ? ((Number) config.get("dayOfMonth")).intValue()
            : basis.getDayOfMonth();
        int clamped = Math.min(dayOfMonth, date.lengthOfMonth());
        yield date.getDayOfMonth() == clamped;
      }
      case CUSTOM -> {
        int intervalDays = config != null && config.get("intervalDays") != null
            ? ((Number) config.get("intervalDays")).intValue()
            : 1;
        if (intervalDays < 1) yield false;
        long daysBetween = java.time.temporal.ChronoUnit.DAYS.between(basis, date);
        yield daysBetween % intervalDays == 0;
      }
    };
  }

  private Event occurrenceFrom(Event definition, LocalDate basis, LocalDate occurrenceDate) {
    Event.EventBuilder builder =
        Event.builder()
            .userId(definition.getUserId())
            .title(definition.getTitle())
            .description(definition.getDescription())
            .location(definition.getLocation())
            .category(definition.getCategory())
            .color(definition.getColor())
            .allDay(definition.getAllDay())
            .freeBusy(definition.getFreeBusy())
            .area(definition.getArea())
            .projectId(definition.getProjectId())
            .goalId(definition.getGoalId())
            .recurringParentId(definition.getId())
            .reminderMinutesBefore(definition.getReminderMinutesBefore());

    if (Boolean.TRUE.equals(definition.getAllDay())) {
      long durationDays =
          definition.getEndDate() != null
              ? java.time.temporal.ChronoUnit.DAYS.between(definition.getStartDate(), definition.getEndDate())
              : 0;
      builder.startDate(occurrenceDate).endDate(occurrenceDate.plusDays(durationDays));
    } else {
      Duration duration = Duration.between(definition.getStartAt(), definition.getEndAt());
      java.time.LocalTime timeOfDay = definition.getStartAt().atZone(ZONE).toLocalTime();
      var occurrenceStart = occurrenceDate.atTime(timeOfDay).atZone(ZONE).toInstant();
      builder.startAt(occurrenceStart).endAt(occurrenceStart.plus(duration));
    }
    return builder.build();
  }

  private void deleteFutureOccurrences(UUID definitionId) {
    LocalDate today = LocalDate.now();
    List<Event> future =
        eventRepository.findAllByRecurringParentId(definitionId).stream()
            .filter(e -> !basisDate(e).isBefore(today))
            .toList();
    eventRepository.deleteAll(future);
  }

  private void requireIsDefinition(Event event) {
    if (event.getRecurrencePattern() == null || event.getRecurringParentId() != null) {
      throw new InvalidRequestException("This event isn't a recurring definition.");
    }
  }

  private void validateConfig(EventRecurrencePattern pattern, Map<String, Object> config) {
    if (pattern == EventRecurrencePattern.CUSTOM
        && (config == null || !(config.get("intervalDays") instanceof Number))) {
      throw new InvalidRequestException("CUSTOM recurrence needs a numeric intervalDays in config.");
    }
  }
}
