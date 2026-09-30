package com.lifeos.job_tracker.integration.board;

import java.time.Instant;

/** One opening as a board reports it, normalised across every ATS. */
public record FetchedPosting(
    String boardId, String title, String url, String location, String description, Instant postedAt) {}
