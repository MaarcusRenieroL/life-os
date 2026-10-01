package com.lifeos.job_tracker;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.job_tracker.domains.entity.JobListing;
import com.lifeos.job_tracker.domains.entity.Skill;
import com.lifeos.job_tracker.domains.enums.VisaSponsorship;
import com.lifeos.job_tracker.domains.enums.WorkModel;
import com.lifeos.job_tracker.exception.ResumeExtractionException;
import com.lifeos.job_tracker.integration.AiAssistant;
import com.lifeos.job_tracker.integration.ClaudeApiClient;
import com.lifeos.job_tracker.integration.JobLinkFetcher;
import com.lifeos.job_tracker.integration.OllamaApiClient;
import com.lifeos.job_tracker.integration.PdfTextExtractor;
import com.lifeos.job_tracker.repository.CompanyRepository;
import com.lifeos.job_tracker.repository.JobListingRepository;
import com.lifeos.job_tracker.repository.JobStatusHistoryRepository;
import com.lifeos.job_tracker.repository.SkillRepository;
import com.lifeos.job_tracker.service.CareerProfileService;
import com.lifeos.job_tracker.service.JobListingService;
import com.lifeos.job_tracker.service.JobMatchingService;
import com.lifeos.job_tracker.service.JobMatchingService.JobFitResult;
import com.lifeos.job_tracker.service.SkillService;
import java.lang.reflect.Field;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/**
 * Exercises the real pipeline wiring end to end (extract -> match -> ATS suggestions) with mocked
 * AI HTTP clients and repositories - no Spring context, no database, no LaTeX/PDF generation
 * (that feature no longer exists; suggestions are text-only advice the candidate applies by hand).
 */
class AtsSuggestionsPipelineTest {

  private final UUID userId = UUID.randomUUID();
  private final ObjectMapper objectMapper = new ObjectMapper();

  // --- Step 1: extraction reliability -------------------------------------------------------

  @Test
  void extractionRetriesOllamaThenFallsBackToClaudeWhenSkillsStaySparse() throws Exception {
    ClaudeApiClient claude = mock(ClaudeApiClient.class);
    OllamaApiClient ollama = mock(OllamaApiClient.class);
    AiAssistant ai = newAiAssistant(claude, ollama);

    String longResume = "Experienced engineer. ".repeat(60); // > 800 chars, plausibly skill-rich

    when(ollama.isConfigured()).thenReturn(true);
    when(ollama.completeJson(anyString(), anyString())).thenReturn(parsedResumeJson(List.of()));
    when(claude.isConfigured()).thenReturn(true);
    when(claude.completeJson(anyString(), anyString()))
        .thenReturn(parsedResumeJson(List.of("Java", "Spring Boot", "PostgreSQL")));

    var parsed = ai.parseResume(longResume);

    assertThat(parsed.skills()).extracting(s -> s.name()).containsExactlyInAnyOrder("Java", "Spring Boot", "PostgreSQL");
    org.mockito.Mockito.verify(ollama, org.mockito.Mockito.times(2)).completeJson(anyString(), anyString());
    org.mockito.Mockito.verify(claude, org.mockito.Mockito.times(1)).completeJson(anyString(), anyString());
  }

  @Test
  void extractionThrowsRatherThanPersistingAnEmptySkillListAfterEveryFallback() throws Exception {
    ClaudeApiClient claude = mock(ClaudeApiClient.class);
    OllamaApiClient ollama = mock(OllamaApiClient.class);
    AiAssistant ai = newAiAssistant(claude, ollama);

    String resume = "A resume with some real content but the extractor keeps failing on it. ".repeat(4);

    when(ollama.isConfigured()).thenReturn(true);
    when(ollama.completeJson(anyString(), anyString())).thenReturn(parsedResumeJson(List.of()));
    when(claude.isConfigured()).thenReturn(true);
    when(claude.completeJson(anyString(), anyString())).thenReturn(parsedResumeJson(List.of()));

    assertThatThrownBy(() -> ai.parseResume(resume)).isInstanceOf(ResumeExtractionException.class);
  }

  // --- Step 2: semantic skill matching --------------------------------------------------------

  @Test
  void semanticFallbackMovesADifferentlyWordedSkillFromMissingToPartial() throws Exception {
    ClaudeApiClient claude = mock(ClaudeApiClient.class);
    OllamaApiClient ollama = mock(OllamaApiClient.class);
    AiAssistant ai = newAiAssistant(claude, ollama);
    SkillRepository skillRepository = mock(SkillRepository.class);
    JobMatchingService jobMatchingService = new JobMatchingService(skillRepository, ai);

    when(ollama.isConfigured()).thenReturn(true);
    when(ollama.completeJson(anyString(), anyString()))
        .thenReturn(objectMapper.readTree("{\"matched\":[\"Relational Database Design\"]}"));
    when(skillRepository.findAllByUserIdOrderByNameAsc(userId)).thenReturn(List.of(skill("PostgreSQL")));

    JobListing job = new JobListing();
    job.setRequiredSkills(List.of("Relational Database Design"));
    job.setNiceToHaveSkills(List.of());

    JobFitResult result = jobMatchingService.score(userId, job);

    assertThat(strings(result, "missingSkills")).isEmpty();
    assertThat(strings(result, "partialMatches")).containsExactly("Relational Database Design");
  }

  // --- Step 3: ATS suggestions (text-only, no resume rewrite) ---------------------------------

  @Test
  void suggestionsAndGapsArePersistedOnTheJobWithoutTouchingTheScore() throws Exception {
    Fixture f = fixture();

    when(f.skillRepository.findAllByUserIdOrderByNameAsc(userId)).thenReturn(List.of(skill("Java")));
    when(f.ollama.completeJson(anyString(), anyString()))
        .thenAnswer(
            invocation -> {
              String userPrompt = invocation.getArgument(1);
              if (userPrompt.contains("REQUIRED SKILLS:")) {
                return objectMapper.readTree("{\"matched\":[]}");
              }
              if (userPrompt.contains("CANDIDATE PROFILE")) {
                return objectMapper.readTree(
                    "{\"suggestions\":[\"Say 'GraphQL' explicitly if you've used it - you haven't, so"
                        + " leave this one alone and lean on your REST API bullets instead.\"],"
                        + "\"gapsVsJd\":[\"GraphQL: not present anywhere in the candidate's profile.\"]}");
              }
              throw new AssertionError("Unexpected Ollama prompt: " + userPrompt);
            });

    JobListing job = baseJob(List.of("GraphQL"));
    job.setFitScore(42);
    f.register(job);

    JobListing updated = f.jobListingService.getAtsSuggestions(userId, job.getId());

    assertThat(updated.getAtsSuggestions()).hasSize(1);
    assertThat(updated.getAtsSuggestionGaps()).containsExactly("GraphQL: not present anywhere in the candidate's profile.");
    // Suggestions are advice only - they must never mutate the job's fit score themselves.
    assertThat(updated.getFitScore()).isEqualTo(42);
  }

  @Test
  void requestingSuggestionsWithNoJobDescriptionFails() throws Exception {
    Fixture f = fixture();
    JobListing job = baseJob(List.of("Java"));
    job.setJobDescriptionText(null);
    f.register(job);

    assertThatThrownBy(() -> f.jobListingService.getAtsSuggestions(userId, job.getId()))
        .isInstanceOf(com.lifeos.job_tracker.exception.InvalidRequestException.class);
  }

  // --- fixtures / helpers ----------------------------------------------------------------------

  private record Fixture(
      ClaudeApiClient claude,
      OllamaApiClient ollama,
      SkillRepository skillRepository,
      JobListingRepository jobListingRepository,
      JobMatchingService jobMatchingService,
      JobListingService jobListingService) {

    void register(JobListing job) {
      lenient().when(jobListingRepository.findByIdAndUserId(job.getId(), job.getUserId())).thenReturn(Optional.of(job));
    }
  }

  private Fixture fixture() throws Exception {
    ClaudeApiClient claude = mock(ClaudeApiClient.class);
    OllamaApiClient ollama = mock(OllamaApiClient.class);
    AiAssistant ai = newAiAssistant(claude, ollama);
    lenient().when(claude.isConfigured()).thenReturn(true);
    lenient().when(ollama.isConfigured()).thenReturn(true);

    SkillRepository skillRepository = mock(SkillRepository.class);
    lenient().when(skillRepository.findByUserIdAndNameIgnoreCase(any(), anyString())).thenReturn(Optional.empty());
    lenient().when(skillRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    JobMatchingService jobMatchingService = new JobMatchingService(skillRepository, ai);
    SkillService skillService = new SkillService(skillRepository);

    JobListingRepository jobListingRepository = mock(JobListingRepository.class);
    lenient().when(jobListingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    PdfTextExtractor pdfTextExtractor = mock(PdfTextExtractor.class);

    CareerProfileService careerProfileService = mock(CareerProfileService.class);
    lenient()
        .when(careerProfileService.buildProfileText(userId))
        .thenReturn("Candidate profile prose with real experience and no fabricated claims.");

    JobListingService jobListingService =
        new JobListingService(
            jobListingRepository,
            mock(CompanyRepository.class),
            ai,
            jobMatchingService,
            mock(JobLinkFetcher.class),
            careerProfileService,
            pdfTextExtractor,
            skillService,
            mock(JobStatusHistoryRepository.class));

    return new Fixture(claude, ollama, skillRepository, jobListingRepository, jobMatchingService, jobListingService);
  }

  private JobListing baseJob(List<String> requiredSkills) {
    JobListing job = new JobListing();
    job.setId(UUID.randomUUID());
    job.setUserId(userId);
    job.setTitle("Backend Engineer");
    job.setCompany("Acme");
    job.setJobDescriptionText("A real job description with real requirements.");
    job.setRequiredSkills(requiredSkills);
    job.setNiceToHaveSkills(List.of());
    job.setWorkModel(WorkModel.REMOTE);
    job.setVisaSponsorship(VisaSponsorship.YES);
    return job;
  }

  /** Reflectively wires the routing @Value fields Spring would normally inject, and points the
   * career-profile fallback path off - tests use the global-resume path throughout. */
  private AiAssistant newAiAssistant(ClaudeApiClient claude, OllamaApiClient ollama) throws Exception {
    AiAssistant ai = new AiAssistant(claude, ollama, objectMapper);
    setField(ai, "resumeParseProvider", "ollama");
    setField(ai, "jobParseProvider", "ollama");
    setField(ai, "emailClassifyProvider", "ollama");
    setField(ai, "atsSuggestionsProvider", "ollama");
    setField(ai, "coverLetterProvider", "claude");
    setField(ai, "interviewPrepProvider", "ollama");
    setField(ai, "skillMatchProvider", "ollama");
    return ai;
  }

  private static void setField(Object target, String name, Object value) throws Exception {
    Field field = target.getClass().getDeclaredField(name);
    field.setAccessible(true);
    field.set(target, value);
  }

  private JsonNode parsedResumeJson(List<String> skillNames) throws Exception {
    String skillsJson =
        skillNames.stream().map(n -> "{\"name\":\"" + n + "\"}").reduce((a, b) -> a + "," + b).orElse("");
    return objectMapper.readTree("{\"skills\":[" + skillsJson + "]}");
  }

  @SuppressWarnings("unchecked")
  private static List<String> strings(JobFitResult result, String key) {
    Object value = result.explanation().get(key);
    return value == null ? List.of() : (List<String>) value;
  }

  private static Skill skill(String name) {
    return Skill.builder().id(UUID.randomUUID()).name(name).build();
  }
}
