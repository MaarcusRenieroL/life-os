package com.lifeos.job_tracker.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.job_tracker.exception.InvalidRequestException;
import com.lifeos.job_tracker.integration.board.AshbySource;
import com.lifeos.job_tracker.integration.board.BoardHttp;
import com.lifeos.job_tracker.integration.board.GreenhouseSource;
import com.lifeos.job_tracker.integration.board.LeverSource;
import com.lifeos.job_tracker.integration.board.OracleSource;
import com.lifeos.job_tracker.integration.board.WorkableSource;
import com.lifeos.job_tracker.integration.board.WorkdaySource;
import org.junit.jupiter.api.Test;

/** Slug validation is the guard that stops a watchlist entry from pointing a scan at another host. */
class BoardSourcesTest {

  private final ObjectMapper mapper = new ObjectMapper();

  @Test
  void simpleBoardsAcceptNamesAndRejectAnythingThatCouldChangeTheHost() {
    var greenhouse = new GreenhouseSource(null);
    greenhouse.validateSlug("figma");
    greenhouse.validateSlug("some-co_2");

    for (String bad : new String[] {"", "../etc", "a/b", "evil.com/x?y", "a b", "figma@evil.com", "a:80"}) {
      assertThatThrownBy(() -> greenhouse.validateSlug(bad)).as(bad).isInstanceOf(InvalidRequestException.class);
    }
    assertThatThrownBy(() -> new LeverSource(null).validateSlug("x/y")).isInstanceOf(InvalidRequestException.class);
    assertThatThrownBy(() -> new AshbySource(null).validateSlug("x y")).isInstanceOf(InvalidRequestException.class);
    assertThatThrownBy(() -> new WorkableSource(null).validateSlug("x?y")).isInstanceOf(InvalidRequestException.class);
  }

  @Test
  void workdayAndOracleSlugsArePinned() {
    var workday = new WorkdaySource(null);
    workday.validateSlug("adobe/wd5/external_experienced");
    assertThatThrownBy(() -> workday.validateSlug("adobe/wd5")).isInstanceOf(InvalidRequestException.class);
    assertThatThrownBy(() -> workday.validateSlug("a.evil.com/wd5/x")).isInstanceOf(InvalidRequestException.class);

    var oracle = new OracleSource(null);
    oracle.validateSlug("eeho.fa.us2.oraclecloud.com/CX_1");
    assertThatThrownBy(() -> oracle.validateSlug("evil.com/CX_1")).isInstanceOf(InvalidRequestException.class);
    assertThatThrownBy(() -> oracle.validateSlug("x.oraclecloud.com.evil.com/CX_1")).isInstanceOf(InvalidRequestException.class);
  }

  @Test
  void htmlDescriptionsAreReducedToText() {
    assertThat(BoardHttp.htmlToText("&lt;p&gt;Build &lt;b&gt;things&lt;/b&gt;&lt;/p&gt;")).isEqualTo("Build things");
    assertThat(BoardHttp.htmlToText("<ul><li>One</li><li>Two</li></ul>")).isEqualTo("One Two");
    assertThat(BoardHttp.htmlToText(null)).isEmpty();
  }

  @Test
  void timestampsParseFromIsoAndEpochMillis() throws Exception {
    assertThat(BoardHttp.instant(mapper.readTree("\"2026-03-01T10:00:00Z\""))).isNotNull();
    assertThat(BoardHttp.instant(mapper.readTree("1772359200000")).getEpochSecond()).isEqualTo(1772359200L);
    assertThat(BoardHttp.instant(mapper.readTree("\"garbage\""))).isNull();
    assertThat(BoardHttp.instant(null)).isNull();
  }
}
