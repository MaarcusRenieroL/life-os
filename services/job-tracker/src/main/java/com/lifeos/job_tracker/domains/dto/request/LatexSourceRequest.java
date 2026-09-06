package com.lifeos.job_tracker.domains.dto.request;

/** The LaTeX document for a resume's template. Blank {@code source} clears it. */
public record LatexSourceRequest(String source) {}
