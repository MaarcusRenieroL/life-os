package com.lifeos.job_tracker.domains.record;

import java.util.List;

public record ResumeTailoringResult(
    String summary, List<String> experienceBullets, List<String> skillsHighlight) {}
