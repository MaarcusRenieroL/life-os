package com.lifeos.tasks.integration;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class CrossModuleCleanupTest {

  private final UUID user = UUID.randomUUID();
  private final UUID goal = UUID.randomUUID();
  private final UUID task = UUID.randomUUID();

  private record Wired(CrossModuleCleanup cleanup, MockRestServiceServer habits, MockRestServiceServer workouts, MockRestServiceServer calendar, MockRestServiceServer notes) {}

  private Wired wire() {
    var h = RestClient.builder().baseUrl("http://habits");
    var w = RestClient.builder().baseUrl("http://workouts");
    var c = RestClient.builder().baseUrl("http://calendar");
    var n = RestClient.builder().baseUrl("http://notes");
    var hs = MockRestServiceServer.bindTo(h).build();
    var ws = MockRestServiceServer.bindTo(w).build();
    var cs = MockRestServiceServer.bindTo(c).build();
    var ns = MockRestServiceServer.bindTo(n).build();
    return new Wired(new CrossModuleCleanup(h.build(), w.build(), c.build(), n.build(), "key"), hs, ws, cs, ns);
  }

  @Test
  void deletingAGoalTellsHabitsWorkoutsCalendarAndNotes() {
    var w = wire();
    w.habits().expect(requestTo("http://habits/v1/habits/internal/goals/" + goal + "/detach?userId=" + user)).andExpect(method(HttpMethod.POST)).andExpect(header("X-Internal-Api-Key", "key")).andRespond(withSuccess());
    w.workouts().expect(requestTo("http://workouts/v1/workouts/internal/goals/" + goal + "/detach?userId=" + user)).andExpect(method(HttpMethod.POST)).andRespond(withSuccess());
    w.calendar().expect(requestTo("http://calendar/v1/calendar/internal/goals/" + goal + "/detach?userId=" + user)).andExpect(method(HttpMethod.POST)).andRespond(withSuccess());
    w.notes().expect(requestTo("http://notes/v1/notes/internal/module-links/GOAL/" + goal + "?userId=" + user)).andExpect(method(HttpMethod.DELETE)).andRespond(withSuccess());

    w.cleanup().goalDeleted(user, goal);

    w.habits().verify();
    w.workouts().verify();
    w.calendar().verify();
    w.notes().verify();
  }

  @Test
  void deletingATaskTellsCalendarAndNotes() {
    var w = wire();
    w.calendar().expect(requestTo("http://calendar/v1/calendar/internal/tasks/" + task + "/detach?userId=" + user)).andExpect(method(HttpMethod.POST)).andRespond(withSuccess());
    w.notes().expect(requestTo("http://notes/v1/notes/internal/module-links/TASK/" + task + "?userId=" + user)).andExpect(method(HttpMethod.DELETE)).andRespond(withSuccess());

    w.cleanup().taskDeleted(user, task);

    w.calendar().verify();
    w.notes().verify();
  }

  @Test
  void aModuleThatIsDownNeverFailsTheDeleteAndTheOthersStillRun() {
    var w = wire();
    w.habits().expect(requestTo("http://habits/v1/habits/internal/goals/" + goal + "/detach?userId=" + user)).andRespond(withServerError());
    w.workouts().expect(requestTo("http://workouts/v1/workouts/internal/goals/" + goal + "/detach?userId=" + user)).andRespond(withSuccess());
    w.calendar().expect(requestTo("http://calendar/v1/calendar/internal/goals/" + goal + "/detach?userId=" + user)).andRespond(withServerError());
    w.notes().expect(requestTo("http://notes/v1/notes/internal/module-links/GOAL/" + goal + "?userId=" + user)).andRespond(withSuccess());

    assertThatCode(() -> w.cleanup().goalDeleted(user, goal)).doesNotThrowAnyException();

    w.workouts().verify();
    w.notes().verify();
  }
}
