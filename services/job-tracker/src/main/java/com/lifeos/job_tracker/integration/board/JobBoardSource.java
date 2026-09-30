package com.lifeos.job_tracker.integration.board;

import com.lifeos.job_tracker.domains.enums.JobBoard;

/** Reads every open posting from one ATS platform's public, unauthenticated job feed. */
public interface JobBoardSource {

  JobBoard board();

  /** Throws {@link com.lifeos.job_tracker.exception.InvalidRequestException} for a malformed slug.
   * Slugs are spliced into request URLs, so this is also the guard against pointing a scan at an
   * arbitrary host. */
  void validateSlug(String slug);

  /** Throws on any network or parse failure; the caller records the error and closes nothing. */
  BoardFetchResult fetch(String slug);
}
