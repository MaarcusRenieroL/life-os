package com.lifeos.job_tracker.integration.board;

import com.fasterxml.jackson.databind.JsonNode;
import com.lifeos.job_tracker.domains.enums.JobBoard;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** {@code jobs.ashbyhq.com/<slug>} */
@Component
@RequiredArgsConstructor
public class AshbySource implements JobBoardSource {

  private static final Pattern SLUG = Pattern.compile("[A-Za-z0-9._-]{1,100}");

  private final BoardHttp http;

  @Override
  public JobBoard board() {
    return JobBoard.ASHBY;
  }

  @Override
  public void validateSlug(String slug) {
    BoardHttp.requireMatches(slug, SLUG, "the name from jobs.ashbyhq.com/<name>");
  }

  @Override
  public BoardFetchResult fetch(String slug) {
    return new BoardFetchResult(
        parse(
            http.get(
                "https://api.ashbyhq.com/posting-api/job-board/"
                    + slug.trim()
                    + "?includeCompensation=false")),
        true);
  }

  static List<FetchedPosting> parse(JsonNode root) {
    List<FetchedPosting> out = new ArrayList<>();
    for (JsonNode job : root.path("jobs")) {
      String id = job.path("id").asText("");
      String url = BoardHttp.text(job, "jobUrl");
      if (id.isBlank() && url.isBlank()) {
        continue;
      }
      out.add(
          new FetchedPosting(
              id.isBlank() ? url : id,
              BoardHttp.text(job, "title"),
              url,
              BoardHttp.text(job, "location"),
              BoardHttp.truncate(BoardHttp.text(job, "descriptionPlain")),
              BoardHttp.instant(job.get("publishedAt"))));
    }
    return out;
  }
}
