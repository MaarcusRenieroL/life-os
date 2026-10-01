package com.lifeos.calendar;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;

import com.lifeos.calendar.domains.dto.request.UpdateEventRequest;
import com.lifeos.calendar.domains.entity.Event;
import com.lifeos.calendar.exception.InvalidRequestException;
import com.lifeos.calendar.repository.EventRepository;
import com.lifeos.calendar.service.EventService;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tools.jackson.databind.json.JsonMapper;

@ExtendWith(MockitoExtension.class)
class EventServiceTest {

  @Mock private EventRepository eventRepository;
  @InjectMocks private EventService eventService;

  private final UUID user = UUID.randomUUID();
  private final JsonMapper json = JsonMapper.builder().build();
  private Event timed;

  @BeforeEach
  void setUp() {
    timed =
        Event.builder()
            .id(UUID.randomUUID())
            .userId(user)
            .title("Standup")
            .location("Zoom")
            .allDay(false)
            .startAt(Instant.parse("2026-10-05T09:00:00Z"))
            .endAt(Instant.parse("2026-10-05T09:30:00Z"))
            .build();
    lenient().when(eventRepository.findByIdAndUserId(timed.getId(), user)).thenReturn(Optional.of(timed));
    lenient().when(eventRepository.save(any(Event.class))).thenAnswer(i -> i.getArgument(0));
  }

  private UpdateEventRequest body(String text) throws Exception {
    return json.readValue(text, UpdateEventRequest.class);
  }

  @Test
  void aNullInTheRequestClearsTheLocationButAMissingKeyKeepsIt() throws Exception {
    eventService.update(user, timed.getId(), body("{\"title\": \"Daily\"}"));
    assertThat(timed.getLocation()).isEqualTo("Zoom");

    eventService.update(user, timed.getId(), body("{\"location\": null}"));
    assertThat(timed.getLocation()).isNull();
  }

  @Test
  void turningATimedEventAllDayDropsItsClockTimes() throws Exception {
    eventService.update(user, timed.getId(), body("{\"allDay\": true, \"startDate\": \"2026-10-05\", \"endDate\": \"2026-10-05\"}"));

    assertThat(timed.getAllDay()).isTrue();
    assertThat(timed.getStartAt()).isNull();
    assertThat(timed.getEndAt()).isNull();
    assertThat(timed.getStartDate()).isEqualTo(LocalDate.of(2026, 10, 5));
  }

  @Test
  void turningAnAllDayEventTimedDropsItsDates() throws Exception {
    Event allDay = Event.builder().id(UUID.randomUUID()).userId(user).title("Holiday").allDay(true).startDate(LocalDate.of(2026, 10, 5)).endDate(LocalDate.of(2026, 10, 6)).build();
    lenient().when(eventRepository.findByIdAndUserId(allDay.getId(), user)).thenReturn(Optional.of(allDay));

    eventService.update(user, allDay.getId(), body("{\"allDay\": false, \"startAt\": \"2026-10-05T09:00:00Z\", \"endAt\": \"2026-10-05T10:00:00Z\"}"));

    assertThat(allDay.getStartDate()).isNull();
    assertThat(allDay.getEndDate()).isNull();
    assertThat(allDay.getStartAt()).isNotNull();
  }

  @Test
  void anEventCannotEndBeforeItStarts() {
    assertThatThrownBy(() -> eventService.update(user, timed.getId(), body("{\"endAt\": \"2026-10-05T08:00:00Z\"}"))).isInstanceOf(InvalidRequestException.class);
  }

  @Test
  void aBlankTitleIsRefused() {
    assertThatThrownBy(() -> eventService.update(user, timed.getId(), body("{\"title\": \"  \"}"))).isInstanceOf(InvalidRequestException.class);
  }
}
