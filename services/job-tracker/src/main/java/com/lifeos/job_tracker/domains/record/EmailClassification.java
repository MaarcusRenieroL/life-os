package com.lifeos.job_tracker.domains.record;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

/**
 * What Claude made of one Gmail message forwarded by batches for job-tracking automation. {@code
 * company}/{@code title} are Claude's best guess at which job the email is about (used only for
 * the status-change types); {@code postings} is populated only for {@code JOB_ALERT_DIGEST}.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record EmailClassification(
    String type,
    String confidence,
    String company,
    String title,
    List<DigestPosting> postings) {

  @JsonIgnoreProperties(ignoreUnknown = true)
  public record DigestPosting(String title, String company, String url) {}
}
