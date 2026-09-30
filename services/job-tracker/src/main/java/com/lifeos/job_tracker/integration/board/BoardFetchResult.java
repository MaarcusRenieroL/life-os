package com.lifeos.job_tracker.integration.board;

import java.util.List;

/**
 * @param complete false when the board holds more openings than one scan reads (page cap reached).
 *     A partial read must never be used to conclude that unseen postings have closed.
 */
public record BoardFetchResult(List<FetchedPosting> postings, boolean complete) {}
