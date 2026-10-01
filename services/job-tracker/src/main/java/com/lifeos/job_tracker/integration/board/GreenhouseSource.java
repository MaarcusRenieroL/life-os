package com.lifeos.job_tracker.integration.board;

import com.fasterxml.jackson.databind.JsonNode;
import com.lifeos.job_tracker.domains.enums.JobBoard;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** {@code boards.greenhouse.io/<slug>} */
@Component
@RequiredArgsConstructor
public class GreenhouseSource implements JobBoardSource {

  private static final Pattern SLUG = Pattern.compile("[A-Za-z0-9._-]{1,100}");

  private final BoardHttp http;

  @Override
  public JobBoard board() {
    return JobBoard.GREENHOUSE;
  }

  @Override
  public void validateSlug(String slug) {
    BoardHttp.requireMatches(slug, SLUG, "the name from boards.greenhouse.io/<name>");
  }

  @Override
  public BoardFetchResult fetch(String slug) {
    return new BoardFetchResult(
        parse(http.get("https://boards-api.greenhouse.io/v1/boards/" + slug.trim() + "/jobs?content=true")),
        true);
  }

  static List<FetchedPosting> parse(JsonNode root) {
    List<FetchedPosting> out = new ArrayList<>();
    for (JsonNode job : root.path("jobs")) {
      String id = job.path("id").asText("");
      String url = BoardHttp.text(job, "absolute_url");
      if (id.isBlank() && url.isBlank()) {
        continue;
      }
      JsonNode posted = job.hasNonNull("first_published") ? job.get("first_published") : job.get("updated_at");
      out.add(
          new FetchedPosting(
              id.isBlank() ? url : id,
              BoardHttp.text(job, "title"),
              url,
              job.path("location").path("name").asText(""),
              BoardHttp.htmlToText(BoardHttp.text(job, "content")),
              BoardHttp.instant(posted)));
    }
    return out;
  }
}
