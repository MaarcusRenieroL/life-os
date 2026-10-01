package com.lifeos.job_tracker.domains.record;

import java.util.List;

/** Result of a single semantic-match call over the required skills a job posting lists that the
 * alias-table matcher in {@code JobMatchingService} couldn't resolve. {@code matched} is the
 * subset of those still-missing required skills that are genuinely equivalent to something the
 * candidate already has (e.g. "container orchestration" vs "Kubernetes") - everything else stays
 * missing. */
public record SkillSemanticMatch(List<String> matched) {}
