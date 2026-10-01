package com.lifeos.job_tracker.integration.board;

import com.fasterxml.jackson.databind.JsonNode;
import com.lifeos.job_tracker.domains.enums.JobBoard;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Oracle Recruiting Cloud. The slug is {@code host/siteNumber}, e.g. {@code
 * eeho.fa.us2.oraclecloud.com/CX_1}. The host is pinned to {@code *.oraclecloud.com}.
 */
@Component
@RequiredArgsConstructor
public class OracleSource implements JobBoardSource {

  private static final Pattern SLUG =
      Pattern.compile("[a-z0-9-]+(\\.[a-z0-9-]+)*\\.oraclecloud\\.com/[A-Za-z0-9_-]{1,60}");
  private static final int PAGE = 200;
  static final int MAX_JOBS = 600;

  private final BoardHttp http;

  @Override
  public JobBoard board() {
    return JobBoard.ORACLE;
  }

  @Override
  public void validateSlug(String slug) {
    BoardHttp.requireMatches(slug, SLUG, "host/siteNumber, e.g. eeho.fa.us2.oraclecloud.com/CX_1");
  }

  @Override
  public BoardFetchResult fetch(String slug) {
    String[] parts = slug.trim().split("/", 2);
    String host = parts[0];
    String site = parts[1];

    List<FetchedPosting> out = new ArrayList<>();
    int total = Integer.MAX_VALUE;
    for (int offset = 0; offset < Math.min(total, MAX_JOBS); offset += PAGE) {
      String url =
          "https://" + host + "/hcmRestApi/resources/latest/recruitingCEJobRequisitions"
              + "?onlyData=true&expand=requisitionList.secondaryLocations"
              + "&finder=findReqs;siteNumber=" + site + ",limit=" + PAGE + ",offset=" + offset;
      JsonNode item = http.get(url).path("items").path(0);
      if (offset == 0 && item.hasNonNull("TotalJobsCount")) {
        total = item.get("TotalJobsCount").asInt();
      }
      List<FetchedPosting> parsed = parse(item, host, site);
      if (parsed.isEmpty()) {
        break;
      }
      out.addAll(parsed);
    }
    return new BoardFetchResult(out, total != Integer.MAX_VALUE && out.size() >= total);
  }

  static List<FetchedPosting> parse(JsonNode item, String host, String site) {
    List<FetchedPosting> out = new ArrayList<>();
    for (JsonNode req : item.path("requisitionList")) {
      String id = BoardHttp.text(req, "Id");
      if (id.isBlank()) {
        continue;
      }
      out.add(
          new FetchedPosting(
              id,
              BoardHttp.text(req, "Title"),
              "https://" + host + "/hcmUI/CandidateExperience/en/sites/" + site + "/job/" + id,
              BoardHttp.text(req, "PrimaryLocation"),
              BoardHttp.truncate(BoardHttp.text(req, "ShortDescriptionStr")),
              BoardHttp.instant(req.get("PostedDate"))));
    }
    return out;
  }
}
