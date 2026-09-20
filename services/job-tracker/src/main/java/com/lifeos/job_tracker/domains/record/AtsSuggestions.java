package com.lifeos.job_tracker.domains.record;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

/**
 * Text-only ATS keyword-alignment advice for one job/resume pair: concrete wording edits the
 * candidate applies to their own resume by hand, plus the honest gaps their background doesn't
 * cover. No resume text or document is generated - see {@code AiAssistant.generateAtsSuggestions}.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record AtsSuggestions(List<String> suggestions, List<String> gapsVsJd) {}
