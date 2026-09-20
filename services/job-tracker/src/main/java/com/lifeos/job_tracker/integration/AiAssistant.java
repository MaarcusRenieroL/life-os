package com.lifeos.job_tracker.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.job_tracker.domains.record.EmailClassification;
import com.lifeos.job_tracker.domains.record.InterviewPrepTopics;
import com.lifeos.job_tracker.domains.record.ParsedJobPosting;
import com.lifeos.job_tracker.domains.record.ParsedResume;
import com.lifeos.job_tracker.domains.record.AtsSuggestions;
import com.lifeos.job_tracker.domains.record.SkillSemanticMatch;
import com.lifeos.job_tracker.exception.ClaudeUnavailableException;
import com.lifeos.job_tracker.exception.ResumeExtractionException;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Domain-shaped prompts on top of {@link ClaudeApiClient} and {@link OllamaApiClient}. Each task
 * below is independently routed to whichever provider {@code ai.routing.*} names for it (env vars:
 * {@code AI_ROUTE_RESUME_PARSE}, {@code AI_ROUTE_JOB_PARSE}, {@code AI_ROUTE_EMAIL_CLASSIFY},
 * {@code AI_ROUTE_TAILOR_RESUME}) - "ollama" or "claude", flippable without a redeploy.
 *
 * <p>Routine, high-volume extraction (resume/job parsing, email classification) defaults to Ollama,
 * which runs locally at zero marginal cost; a wrong guess there just means a re-parse. If a call
 * routed to Ollama fails (not running, model not pulled), it falls back to Claude automatically
 * rather than hard failing.
 */
@Component
public class AiAssistant {

  private static final Logger log = LoggerFactory.getLogger(AiAssistant.class);

  private final ClaudeApiClient claude;
  private final OllamaApiClient ollama;
  private final ObjectMapper objectMapper;

  @Value("${ai.routing.resume-parse:ollama}")
  private String resumeParseProvider;

  @Value("${ai.routing.job-parse:ollama}")
  private String jobParseProvider;

  @Value("${ai.routing.email-classify:ollama}")
  private String emailClassifyProvider;

  @Value("${ai.routing.ats-suggestions:ollama}")
  private String atsSuggestionsProvider;

  @Value("${ai.routing.cover-letter:claude}")
  private String coverLetterProvider;

  @Value("${ai.routing.interview-prep:ollama}")
  private String interviewPrepProvider;

  @Value("${ai.routing.skill-match:ollama}")
  private String skillMatchProvider;

  public AiAssistant(ClaudeApiClient claude, OllamaApiClient ollama, ObjectMapper objectMapper) {
    this.claude = claude;
    this.ollama = ollama;
    this.objectMapper = objectMapper;
  }

  /** True if at least one provider can serve the routine/routed tasks. */
  public boolean available() {
    return claude.isConfigured() || ollama.isConfigured();
  }

  public ParsedResume parseResume(String resumeText) {
    String systemPrompt = "You are a resume parser. Reply with ONLY a JSON object, no prose.";
    String userPrompt =
        """
        Extract structured data from the resume below. Use this exact shape:
        {
          "name": string, "email": string, "phone": string, "location": string,
          "githubUrl": string, "linkedinUrl": string, "portfolioUrl": string,
          "summary": string,
          "experience": [{"title","company","location","startDate","endDate","bullets":[string]}],
          "education": [{"degree","school","field","graduationYear"}],
          "projects": [{"name","description","techStack":[string],"link","startDate","endDate","bullets":[string]}],
          "skills": [{"name","category","proficiency","yearsOfExperience","confidence"}],
          "certifications": [string], "achievements": [string]
        }
        "bullets" is each experience/project entry's line items, verbatim from the resume, not a
        single merged paragraph. "startDate"/"endDate" must be "YYYY-MM" (e.g. "2024-08"), never
        "Aug 2024" or similar - null if the resume gives no date or says "Present"/"Ongoing".
        "summary" is the resume's own professional-summary paragraph if it has one, otherwise omit
        it rather than writing a new one. category is one of LANGUAGE,
        FRAMEWORK, PLATFORM, DATABASE, TOOL, SOFT, OTHER.
        proficiency is one of BEGINNER, INTERMEDIATE, ADVANCED, EXPERT.
        confidence is 0..1. yearsOfExperience must be a plain JSON number (e.g. 2.5) - never a
        string, and never with a trailing "+" or unit, even if the resume phrases it as "2.5+
        years". Omit unknown scalar fields rather than guessing.

        RESUME:
        """
            + resumeText;

    ParsedResume parsed =
        routedCompleteJson(resumeParseProvider, systemPrompt, userPrompt, ParsedResume.class);
    int textLength = resumeText == null ? 0 : resumeText.length();
    int skillCount = parsed.skills() == null ? 0 : parsed.skills().size();
    log.info(
        "Resume extraction: {} chars -> {} skills (provider={})",
        textLength,
        skillCount,
        resumeParseProvider);

    // Ollama can return a syntactically valid response with an implausibly low skill count for
    // resume text that plainly has more (including zero) - no exception, so the usual
    // fallback-on-failure path never triggers, and this silently starves every downstream score.
    // A real resume this long having so few extractable skills is implausible, so treat it as a
    // parse failure and retry.
    if (isSuspiciouslySparse(skillCount, textLength)
        && "ollama".equalsIgnoreCase(resumeParseProvider)) {
      log.warn(
          "Ollama parsed only {} skill(s) from a {}-char resume - retrying on Ollama once",
          skillCount,
          textLength);
      parsed =
          routedCompleteJson(resumeParseProvider, systemPrompt, userPrompt, ParsedResume.class);
      skillCount = parsed.skills() == null ? 0 : parsed.skills().size();

      if (isSuspiciouslySparse(skillCount, textLength) && claude.isConfigured()) {
        log.warn(
            "Ollama retry still only found {} skill(s) from a {}-char resume - falling back to"
                + " Claude directly",
            skillCount,
            textLength);
        parsed = convert(claude.completeJson(systemPrompt, userPrompt), ParsedResume.class);
        skillCount = parsed.skills() == null ? 0 : parsed.skills().size();
      }
    }

    if (skillCount == 0 && textLength > 200) {
      throw new ResumeExtractionException(
          "Could not extract any skills from a "
              + textLength
              + "-char resume after retrying - "
              + "extraction likely failed rather than the resume genuinely listing none.");
    }
    return parsed;
  }

  /**
   * A resume long enough to plausibly list several skills but extracted with very few is more
   * likely a bad parse than a genuinely sparse resume - the exact-zero case is caught separately as
   * a hard failure below; this only drives the retry/fallback decision.
   */
  private static boolean isSuspiciouslySparse(int skillCount, int textLength) {
    if (textLength > 800) {
      return skillCount < 3;
    }
    return skillCount == 0 && textLength > 200;
  }

  /**
   * Structures a raw job page (fetched from a pasted URL - JSON-LD, meta tags, or stripped body
   * text) into listing fields. Also cleans the description down to just the posting's prose.
   */
  public ParsedJobPosting parseJobPosting(String rawPageContent) {
    return routedCompleteJson(
        jobParseProvider,
        "You extract a single job posting from raw web-page content. Reply with ONLY a JSON"
            + " object, no prose.",
        """
        The text below was scraped from a job posting URL. It may contain navigation, cookie
        banners, JSON-LD or other noise. Extract the one job posting. Shape:
        {
          "title": string, "company": string, "location": string,
          "workModel": one of ONSITE|HYBRID|REMOTE,
          "seniorityLevel": one of INTERN|JUNIOR|MID|SENIOR|STAFF|LEAD|PRINCIPAL,
          "industry": string,
          "salaryMin": number, "salaryMax": number, "currency": 3-letter code,
          "requiredSkills": [string], "niceToHaveSkills": [string], "techStack": [string],
          "jobDescriptionText": string
        }
        "requiredSkills"/"niceToHaveSkills" are short skill or technology names (2-6 words each,
        e.g. "REST APIs", "AWS", "Containerization") distilled from the posting's requirements -
        never a whole requirement sentence copied verbatim. One bullet in the posting can still
        become one skill if it's already that concise, but split a bullet into its distinct named
        skills/technologies whenever it names more than one (e.g. "Experience with AWS, Docker,
        and Kubernetes" -> three separate entries), and drop any bullet that's just a general trait
        (autonomy, ownership, communication) rather than a named skill.
        NEVER emit one of the posting's own section headings as a skill (e.g. a posting with a
        "Cross-Functional & Agile Collaboration:" heading followed by prose about working with
        product/UX/QA teams must NOT produce "Cross-Functional & Agile Collaboration" as a skill -
        extract the concrete named tools/technologies/practices from the prose under that heading
        instead, the same way you would for a plain bullet list; a heading is structure, not a
        skill). This matters most for postings that organize requirements under bolded category
        headings rather than flat bullets - go one level deeper into each section's body text
        every time, never stop at the heading.

        "jobDescriptionText" must be the posting's own description prose (responsibilities,
        requirements, about the role) with the web-page noise removed - keep the actual wording
        verbatim, don't summarise, but DO restore real structure: a blank line between each
        section (About the company / About the role / Requirements / Benefits / etc.), a short
        heading line for each section, and "- " at the start of each bullet point in a list
        (skills, responsibilities, requirements). Scraped pages often collapse all of this onto
        one line with no punctuation between sentences - reconstruct the paragraph/heading/bullet
        breaks a human would have seen on the actual page, don't just copy the flattened text.
        Omit any scalar field the page doesn't state rather than guessing. "jobDescriptionText"
        must be a single plain string (with \\n for line breaks) - never a nested JSON object.
        If the content is clearly not a job posting, return {}.

        RAW PAGE CONTENT:
        """
            + rawPageContent,
        ParsedJobPosting.class);
  }

  /**
   * Text-only ATS advice: concrete, specific edits the candidate can make to their own resume by
   * hand to better match this job's terminology, plus the honest list of required/nice-to-have
   * items their real background doesn't support. Does not rewrite or regenerate the resume itself
   * - the candidate applies these by hand, so there's no LaTeX/PDF output and nothing to fabricate
   * into a document that gets submitted.
   */
  public AtsSuggestions generateAtsSuggestions(
      String jobTitle,
      String company,
      String jobDescriptionText,
      List<String> requiredSkills,
      List<String> missingSkills,
      List<String> partialSkills,
      String resumeText,
      List<String> candidateSkillNames) {
    return routedCompleteJson(
        atsSuggestionsProvider,
        "You are an ATS resume-keyword coach. Reply with ONLY a JSON object, no prose, no markdown"
            + " fence.",
        """
        Compare the candidate's real resume against the job below and suggest concrete, specific
        wording edits the candidate can make BY HAND to better match this job's terminology for an
        ATS keyword scan. Do not write a new resume or any resume text yourself - only describe
        what to change and why. Shape:
        {
          "suggestions": [string],
          "gapsVsJd": [string]
        }

        GROUND RULES:
        - Every suggestion must point at something already true of the candidate (an existing
          bullet, project, or skill) and describe a wording/emphasis change only - never suggest
          adding a skill, tool, or achievement the candidate's profile doesn't support.
        - Where the job's required-skill wording differs only cosmetically from how the candidate
          already describes it (e.g. job says "Tailwind", candidate says "Tailwind CSS"; a version
          qualifier the candidate's tooling already covers), suggest using the job's own phrasing -
          that is honest alignment, exactly what an ATS keyword scan rewards.
        - "suggestions" (4-10 items): specific, actionable edits, each naming the bullet/section to
          change and the exact rewording to make, tied to a specific job requirement.
        - "gapsVsJd": required or nice-to-have items from this job that the candidate's real
          background does not support. Say so plainly - do not soften it into something that sounds
          like a workaround, and do not suggest wording that would imply the candidate has it.

        JOB:
        Title: %s
        Company: %s
        Required skills: %s
        Skills the candidate is missing: %s
        Skills the candidate partially matches: %s
        Description:
        %s

        CANDIDATE PROFILE (verbatim - contact info, summary, work experience, projects with real
        links, education, skills, and achievements):
        %s

        CANDIDATE'S KNOWN SKILLS (structured, already extracted from the profile above - treat
        this as the authoritative skill list):
        %s
        """
            .formatted(
                blank(jobTitle),
                blank(company),
                String.join(", ", safe(requiredSkills)),
                String.join(", ", safe(missingSkills)),
                String.join(", ", safe(partialSkills)),
                blank(jobDescriptionText),
                blank(resumeText),
                String.join(", ", safe(candidateSkillNames))),
        AtsSuggestions.class);
  }

  /**
   * Classifies one Gmail message forwarded by batches: is it a job-alert digest (a list of new
   * postings), an application/interview/rejection/offer signal for a job the candidate already
   * applied to, or unrelated mail that happened to match the search query. Told explicitly to favor
   * a lower confidence over a guess, since a wrong auto-applied status silently corrupts the
   * candidate's pipeline.
   */
  public EmailClassification classifyEmail(String fromAddress, String subject, String body) {
    return routedCompleteJson(
        emailClassifyProvider,
        "You classify an email for a job-tracking automation. Reply with ONLY a JSON object, no"
            + " prose.",
        """
        Classify this email into exactly one type:
        - JOB_ALERT_DIGEST: a job board's "new jobs matching your search" digest, listing one or
          more postings with links.
        - APPLICATION_CONFIRMATION: confirms an application was received/submitted.
        - INTERVIEW_INVITE: invites the candidate to an interview or next round.
        - REJECTION: rejects the candidate or closes out the application.
        - OFFER: extends a job offer.
        - UNRELATED: anything else (newsletters, unrelated notifications, spam).

        Reply with this exact shape:
        {
          "type": one of the six values above,
          "confidence": "HIGH" | "MEDIUM" | "LOW",
          "company": string or null - your best guess which company this is about,
          "title": string or null - your best guess which role this is about,
          "postings": [{"title","company","url"}] - ONLY for JOB_ALERT_DIGEST, one entry per
            posting in the digest; omit or use an empty array for every other type
        }

        Use LOW confidence whenever the email is ambiguous, generic, or you are guessing at the
        company/role - do not force a HIGH confidence to seem decisive.

        FROM: %s
        SUBJECT: %s
        BODY:
        %s
        """
            .formatted(blank(fromAddress), blank(subject), blank(body)),
        EmailClassification.class);
  }

  /**
   * Drafts a cover letter grounded only in the candidate's real resume content - never invents
   * employers, projects, skills, or achievements, since this is a document that gets sent to a
   * real employer.
   */
  public String generateCoverLetter(
      String jobTitle, String company, String jobDescriptionText, String resumeText) {
    return routedComplete(
        coverLetterProvider,
        "You write cover letters. Reply with ONLY the letter text, no subject line, no prose"
            + " before or after, no markdown formatting.",
        """
        Write a concise, specific cover letter (3-4 short paragraphs) for the candidate applying
        to the job below, using ONLY real experience from their resume - never invent employers,
        projects, skills, or achievements the resume doesn't support. Reference 1-2 concrete
        things from their actual background that genuinely match what this job asks for. Avoid
        generic filler ("I am a hard worker", "I am excited about this opportunity") - every
        sentence should say something specific to this candidate and this job. Plain text, ready
        to paste - no placeholders like [Your Name] left unfilled if the resume states a name.

        JOB:
        Title: %s
        Company: %s
        Description:
        %s

        CANDIDATE RESUME (verbatim extracted text):
        %s
        """
            .formatted(
                blank(jobTitle), blank(company), blank(jobDescriptionText), blank(resumeText)));
  }

  /**
   * Suggests concrete topics to prepare for one interview round, grounded in the job posting and
   * (when it's a technical/system-design round) the candidate's own resume - not just a generic
   * "know data structures" list.
   */
  public List<String> generateInterviewPrepTopics(
      String roundType,
      String jobTitle,
      String company,
      String jobDescriptionText,
      String resumeText) {
    return routedCompleteJson(
            interviewPrepProvider,
            "You coach candidates for job interviews. Reply with ONLY a JSON object, no prose.",
            """
            Suggest concrete topics to prepare for a %s interview round for the job below. Shape:
            {"topics": [string]}

            5-8 short, specific topics (not generic advice like "practice communication") - concrete
            technologies, question types, or areas drawn from the job's actual requirements and, where
            relevant, gaps or emphases in the candidate's own resume relative to this job.

            ROUND: %s

            JOB:
            Title: %s
            Company: %s
            Description:
            %s

            CANDIDATE RESUME (verbatim extracted text, may be empty):
            %s
            """
                .formatted(
                    blank(roundType),
                    blank(roundType),
                    blank(jobTitle),
                    blank(company),
                    blank(jobDescriptionText),
                    blank(resumeText)),
            InterviewPrepTopics.class)
        .topics();
  }

  /**
   * One call per job/resume pair (never per skill) asking whether any of the job's still-missing
   * required skills are actually covered by the candidate's skill list under different wording
   * (e.g. job says "container orchestration", candidate has "Kubernetes"). Only called by {@code
   * JobMatchingService} on the leftover skills the alias table in {@code normalise()} couldn't
   * resolve - routine, so it defaults to Ollama like the other high-volume extraction tasks rather
   * than being pinned to Claude.
   */
  public List<String> semanticSkillMatch(
      List<String> missingRequiredSkills, List<String> candidateSkillNames) {
    if (missingRequiredSkills == null || missingRequiredSkills.isEmpty()) {
      return List.of();
    }
    return routedCompleteJson(
            skillMatchProvider,
            "You match job-required skills against a candidate's skill list for a fit score. Reply"
                + " with ONLY a JSON object, no prose.",
            """
            The candidate's skills are listed below. For each REQUIRED SKILL, decide if it is
            genuinely the same skill as one already in the candidate's list, just described
            differently (e.g. "container orchestration" vs "Kubernetes", "relational databases" vs
            "PostgreSQL", "distributed messaging" vs "Kafka"). Do NOT match skills that are merely
            related or adjacent (e.g. "Kubernetes" does not match "Docker" - one is orchestration,
            the other is containers; "SQL" does not match "MongoDB"). Reply with this exact shape:
            {"matched": [string]} - only the required-skill strings (copied verbatim from the
            REQUIRED SKILLS list below) that have a genuine equivalent in the candidate's list.
            Omit any required skill with no real match - do not guess.

            REQUIRED SKILLS:
            %s

            CANDIDATE SKILLS:
            %s
            """
                .formatted(
                    String.join(", ", missingRequiredSkills),
                    String.join(", ", safe(candidateSkillNames))),
            SkillSemanticMatch.class)
        .matched();
  }

  /**
   * Resolves {@code providerName} to a client, calls it, and converts the result to {@code type}.
   * Falls back to Claude if an Ollama-routed call fails outright (server not running, model not
   * pulled) OR returns JSON that won't map to {@code type} - a local 7B model occasionally produces
   * malformed shapes (e.g. nesting an object where a plain string field was asked for) on complex
   * input, and that's just as much a "this routed call didn't work" case as a network failure.
   * Claude staying reachable is what makes routing routine work to Ollama safe either way.
   */
  private <T> T routedCompleteJson(
      String providerName, String systemPrompt, String userPrompt, Class<T> type) {
    AiClient primary = "ollama".equalsIgnoreCase(providerName) ? ollama : claude;

    if (primary == ollama && !ollama.isConfigured()) {
      log.info("Ollama routed but not enabled - using Claude instead");
      return convert(claude.completeJson(systemPrompt, userPrompt), type);
    }

    try {
      return convert(primary.completeJson(systemPrompt, userPrompt), type);
    } catch (RuntimeException exception) {
      if (primary == ollama) {
        log.warn(
            "Ollama call failed or returned unmappable JSON ({}), falling back to Claude",
            exception.getMessage());
        return convert(claude.completeJson(systemPrompt, userPrompt), type);
      }
      throw exception;
    }
  }

  private String routedComplete(String providerName, String systemPrompt, String userPrompt) {
    AiClient primary = "ollama".equalsIgnoreCase(providerName) ? ollama : claude;

    if (primary == ollama && !ollama.isConfigured()) {
      log.info("Ollama routed but not enabled - using Claude instead");
      return claude.complete(systemPrompt, userPrompt);
    }

    try {
      return primary.complete(systemPrompt, userPrompt);
    } catch (RuntimeException exception) {
      if (primary == ollama) {
        log.warn("Ollama call failed ({}), falling back to Claude", exception.getMessage());
        return claude.complete(systemPrompt, userPrompt);
      }
      throw exception;
    }
  }

  private <T> T convert(JsonNode json, Class<T> type) {
    try {
      return objectMapper.treeToValue(json, type);
    } catch (Exception exception) {
      log.warn(
          "Could not map AI response to {}: {} -- payload was: {}",
          type.getSimpleName(),
          exception.getMessage(),
          json.toString());
      throw new ClaudeUnavailableException(
          "Could not map AI response to " + type.getSimpleName() + ": " + exception.getMessage(),
          exception);
    }
  }

  private static String blank(String value) {
    return value == null || value.isBlank() ? "(not provided)" : value;
  }

  private static List<String> safe(List<String> list) {
    return list == null ? List.of() : list;
  }
}
