package com.lifeos.job_tracker.domains.dto.request;

/**
 * Add a job from a pasted URL. {@code jobDescriptionText} is the fallback the UI sends when the
 * first attempt came back 422 because the site blocked a server-side read.
 */
public record FromLinkRequest(String url, String jobDescriptionText) {}
