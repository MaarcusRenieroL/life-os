package com.lifeos.job_tracker.integration.board;

import com.fasterxml.jackson.databind.JsonNode;
import com.lifeos.job_tracker.domains.enums.JobBoard;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** {@code apply.workable.com/<slug>} */
@Component
@RequiredArgsConstructor
public class WorkableSource implements JobBoardSource {

  private static final Pattern SLUG = Pattern.compile("[A-Za-z0-9._-]{1,100}");

  private final BoardHttp http;

  @Override
  public JobBoard board() {
    return JobBoard.WORKABLE;
  }

  @Override
  public void validateSlug(String slug) {
    BoardHttp.requireMatches(slug, SLUG, "the name from apply.workable.com/<name>");
  }

  @Override
  public BoardFetchResult fetch(String slug) {
    return new BoardFetchResult(
        parse(
            http.get(
                "https://apply.workable.com/api/v1/widget/accounts/" + slug.trim() + "?details=true")),
        true);
  }

  static List<FetchedPosting> parse(JsonNode root) {
    List<FetchedPosting> out = new ArrayList<>();
    for (JsonNode job : root.path("jobs")) {
      String url = BoardHttp.text(job, "url");
      String id = BoardHttp.text(job, "shortcode");
      if (id.isBlank() && url.isBlank()) {
        continue;
      }
      List<String> place = new ArrayList<>();
      for (String part : new String[] {"city", "state", "country"}) {
        String value = BoardHttp.text(job, part);
        if (!value.isBlank()) {
          place.add(value);
        }
      }
      out.add(
          new FetchedPosting(
              id.isBlank() ? url : id,
              BoardHttp.text(job, "title"),
              url,
              String.join(", ", place),
              BoardHttp.htmlToText(BoardHttp.text(job, "description")),
              BoardHttp.instant(job.get("published_on"))));
    }
    return out;
  }
}
