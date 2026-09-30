package com.lifeos.job_tracker.integration.board;

import com.fasterxml.jackson.databind.JsonNode;
import com.lifeos.job_tracker.domains.enums.JobBoard;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** {@code jobs.lever.co/<slug>} */
@Component
@RequiredArgsConstructor
public class LeverSource implements JobBoardSource {

  private static final Pattern SLUG = Pattern.compile("[A-Za-z0-9._-]{1,100}");

  private final BoardHttp http;

  @Override
  public JobBoard board() {
    return JobBoard.LEVER;
  }

  @Override
  public void validateSlug(String slug) {
    BoardHttp.requireMatches(slug, SLUG, "the name from jobs.lever.co/<name>");
  }

  @Override
  public BoardFetchResult fetch(String slug) {
    return new BoardFetchResult(
        parse(http.get("https://api.lever.co/v0/postings/" + slug.trim() + "?mode=json")), true);
  }

  static List<FetchedPosting> parse(JsonNode root) {
    List<FetchedPosting> out = new ArrayList<>();
    for (JsonNode job : root) {
      String id = job.path("id").asText("");
      String url = BoardHttp.text(job, "hostedUrl");
      if (id.isBlank() && url.isBlank()) {
        continue;
      }
      out.add(
          new FetchedPosting(
              id.isBlank() ? url : id,
              BoardHttp.text(job, "text"),
              url,
              job.path("categories").path("location").asText(""),
              BoardHttp.truncate(BoardHttp.text(job, "descriptionPlain")),
              BoardHttp.instant(job.get("createdAt"))));
    }
    return out;
  }
}
