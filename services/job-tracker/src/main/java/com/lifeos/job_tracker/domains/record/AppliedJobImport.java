package com.lifeos.job_tracker.domains.record;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

/** Applications read out of pasted job-board text (e.g. Naukri's "Applied jobs" page). */
public final class AppliedJobImport {

  private AppliedJobImport() {}

  /** What the model returns for one chunk of pasted text. */
  @JsonIgnoreProperties(ignoreUnknown = true)
  public record Parsed(List<Item> jobs) {}

  @JsonIgnoreProperties(ignoreUnknown = true)
  public record Item(String title, String company, String location, String appliedOn) {}

  /** One row of the preview the candidate confirms; {@code duplicate} rows are already tracked. */
  public record Candidate(String title, String company, String location, String appliedOn, boolean duplicate) {}

  public record Result(int created, int skipped) {}
}
