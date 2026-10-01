package com.lifeos.job_tracker.integration.board;

import com.fasterxml.jackson.databind.JsonNode;
import com.lifeos.job_tracker.domains.enums.JobBoard;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Workday career sites. The slug is {@code tenant/wdN/site}, read off the careers URL: {@code
 * adobe.wd5.myworkdayjobs.com/external_experienced} becomes {@code adobe/wd5/external_experienced}.
 *
 * <p>Workday exposes no description in the listing feed, only title and location, so discovery
 * scores these on title alone until the job is promoted.
 */
@Component
@RequiredArgsConstructor
public class WorkdaySource implements JobBoardSource {

  private static final Pattern SLUG = Pattern.compile("[a-z0-9-]{1,60}/wd\\d{1,2}/[A-Za-z0-9_-]{1,100}");
  private static final int PAGE = 20;
  /** 25 requests per company per scan; boards larger than this are read partially. */
  static final int MAX_JOBS = 500;

  private final BoardHttp http;

  @Override
  public JobBoard board() {
    return JobBoard.WORKDAY;
  }

  @Override
  public void validateSlug(String slug) {
    BoardHttp.requireMatches(slug, SLUG, "tenant/wdN/site, e.g. adobe/wd5/external_experienced");
  }

  @Override
  public BoardFetchResult fetch(String slug) {
    String[] parts = slug.trim().split("/");
    String tenant = parts[0];
    String base = "https://" + tenant + "." + parts[1] + ".myworkdayjobs.com";
    String api = base + "/wday/cxs/" + tenant + "/" + parts[2] + "/jobs";

    List<FetchedPosting> out = new ArrayList<>();
    int total = Integer.MAX_VALUE;
    for (int offset = 0; offset < Math.min(total, MAX_JOBS); offset += PAGE) {
      JsonNode page =
          http.post(
              api,
              Map.of("appliedFacets", Map.of(), "limit", PAGE, "offset", offset, "searchText", ""));
      // Workday reports the true total only on the first page.
      if (offset == 0 && page.hasNonNull("total")) {
        total = page.get("total").asInt();
      }
      List<FetchedPosting> parsed = parse(page, base + "/" + parts[2]);
      if (parsed.isEmpty()) {
        break;
      }
      out.addAll(parsed);
    }
    return new BoardFetchResult(out, total != Integer.MAX_VALUE && out.size() >= total);
  }

  static List<FetchedPosting> parse(JsonNode page, String siteBase) {
    List<FetchedPosting> out = new ArrayList<>();
    for (JsonNode job : page.path("jobPostings")) {
      String path = BoardHttp.text(job, "externalPath");
      if (path.isBlank()) {
        continue;
      }
      JsonNode bullets = job.path("bulletFields");
      String reqId = bullets.isArray() && !bullets.isEmpty() ? bullets.get(0).asText("") : "";
      out.add(
          new FetchedPosting(
              reqId.isBlank() ? path : reqId,
              BoardHttp.text(job, "title"),
              siteBase + path,
              BoardHttp.text(job, "locationsText"),
              "",
              null));
    }
    return out;
  }
}
