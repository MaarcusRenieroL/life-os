package com.lifeos.job_tracker.domains.record;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

/**
 * Claude's response to a "tailor my resume for this job" request: concrete improvement points
 * grounded in the candidate's real experience, a full LaTeX resume document the candidate can
 * paste straight into Overleaf, and the same resume as plain text (for a quick copy or a
 * print-to-PDF export, no LaTeX toolchain required).
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record ResumeTailoringResult(List<String> improvementPoints, String latexResume, String plainTextResume) {}
