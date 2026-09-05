package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.entity.JobListing;
import com.lifeos.job_tracker.domains.entity.ResumeKeywordMatch;
import com.lifeos.job_tracker.domains.entity.ResumeSection;
import com.lifeos.job_tracker.domains.record.SectionView;
import com.lifeos.job_tracker.exception.InvalidRequestException;
import com.lifeos.job_tracker.exception.ResourceNotFoundException;
import com.lifeos.job_tracker.integration.AiAssistant;
import com.lifeos.job_tracker.integration.ResumeSectionRenderer;
import com.lifeos.job_tracker.kafka.JobEventProducer;
import com.lifeos.job_tracker.kafka.JobEventTopics;
import com.lifeos.job_tracker.repository.JobListingRepository;
import com.lifeos.job_tracker.repository.ResumeKeywordMatchRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ResumeKeywordAnalysisService {

  private static final Pattern WORD = Pattern.compile("[a-zA-Z][a-zA-Z0-9+.#-]{2,}");
  private static final Set<String> STOPWORDS =
      Set.of(
          "the", "and", "for", "with", "you", "your", "our", "will", "have", "has", "are", "this",
          "that", "from", "who", "job", "role", "work", "team", "years", "experience", "ability",
          "must", "including", "such", "using", "into", "about", "their", "them", "they", "can",
          "all", "not", "any", "per", "etc");

  private final ResumeKeywordMatchRepository matchRepository;
  private final ResumeVariantService resumeVariantService;
  private final JobListingRepository jobListingRepository;
  private final AiAssistant ai;
  private final ResumeSectionRenderer sectionRenderer;
  private final JobEventProducer eventProducer;

  @Transactional
  public ResumeKeywordMatch analyze(UUID userId, UUID variantId, UUID jobListingId) {
    List<ResumeSection> sections = resumeVariantService.sections(userId, variantId);
    JobListing job =
        jobListingRepository
            .findByIdAndUserId(jobListingId, userId)
            .orElseThrow(() -> ResourceNotFoundException.of("Job listing", jobListingId));
    if (job.getJobDescriptionText() == null || job.getJobDescriptionText().isBlank()) {
      throw new InvalidRequestException("Job listing has no description to analyze against");
    }

    List<String> keywords =
        ai.available() ? ai.extractJobKeywords(job.getJobDescriptionText()) : heuristicKeywords(job.getJobDescriptionText());

    String resumeText =
        sectionRenderer
            .toMarkdown(
                sections.stream()
                    .map(
                        section ->
                            new SectionView(
                                section.getSectionType() == null ? null : section.getSectionType().name(),
                                section.getTitle(),
                                section.getContent()))
                    .toList())
            .toLowerCase(Locale.ROOT);

    List<String> matched = keywords.stream().filter(keyword -> resumeText.contains(keyword.toLowerCase(Locale.ROOT))).toList();
    List<String> missing = keywords.stream().filter(keyword -> !matched.contains(keyword)).toList();
    BigDecimal density =
        keywords.isEmpty()
            ? BigDecimal.ZERO
            : BigDecimal.valueOf(100.0 * matched.size() / keywords.size()).setScale(2, RoundingMode.HALF_UP);

    ResumeKeywordMatch match =
        matchRepository.save(
            ResumeKeywordMatch.builder()
                .resumeVariantId(variantId)
                .jobListingId(jobListingId)
                .matchedKeywords(matched)
                .missingKeywords(missing)
                .keywordDensity(density)
                .score(density.intValue())
                .build());
    eventProducer.emit(
        JobEventTopics.RESUME_KEYWORDS_ANALYZED,
        userId,
        Map.of("resumeVariantId", variantId.toString(), "score", match.getScore()));
    return match;
  }

  @Transactional(readOnly = true)
  public List<ResumeKeywordMatch> history(UUID userId, UUID variantId, UUID jobListingId) {
    resumeVariantService.get(userId, variantId);
    return jobListingId == null
        ? matchRepository.findAllByResumeVariantIdOrderByAnalyzedAtDesc(variantId)
        : matchRepository.findAllByResumeVariantIdAndJobListingIdOrderByAnalyzedAtDesc(variantId, jobListingId);
  }

  /** Word-frequency fallback for when Claude isn't configured: top 20 non-trivial words in the JD. */
  private static List<String> heuristicKeywords(String jobDescription) {
    Map<String, Integer> counts = new LinkedHashMap<>();
    var matcher = WORD.matcher(jobDescription);
    while (matcher.find()) {
      String word = matcher.group().toLowerCase(Locale.ROOT);
      if (STOPWORDS.contains(word)) {
        continue;
      }
      counts.merge(word, 1, Integer::sum);
    }
    return counts.entrySet().stream()
        .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
        .limit(20)
        .map(Map.Entry::getKey)
        .toList();
  }
}
