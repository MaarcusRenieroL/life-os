package com.lifeos.job_tracker.domains.record;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

/**
 * Claude's response to a "tailor my resume for this job" request: concrete improvement points
 * grounded in the candidate's real experience, plus a full LaTeX resume document the candidate can
 * paste straight into Overleaf or have rendered to PDF (see {@code LatexCompiler}).
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record ResumeTailoringResult(List<String> improvementPoints, String latexResume) {}
