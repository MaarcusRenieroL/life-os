package com.lifeos.job_tracker.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.job_tracker.domains.record.EmailClassification;
import com.lifeos.job_tracker.domains.record.InterviewPrepTopics;
import com.lifeos.job_tracker.domains.record.ParsedJobPosting;
import com.lifeos.job_tracker.domains.record.ParsedResume;
import com.lifeos.job_tracker.domains.record.ResumeTailoringResult;
import com.lifeos.job_tracker.exception.ClaudeUnavailableException;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Domain-shaped prompts on top of {@link ClaudeApiClient} and {@link OllamaApiClient}. Each task
 * below is independently routed to whichever provider {@code ai.routing.*} names for it (env
 * vars: {@code AI_ROUTE_RESUME_PARSE}, {@code AI_ROUTE_JOB_PARSE}, {@code AI_ROUTE_EMAIL_CLASSIFY},
 * {@code AI_ROUTE_TAILOR_RESUME}) - "ollama" or "claude", flippable without a redeploy.
 *
 * <p>Routine, high-volume extraction (resume/job parsing, email classification) defaults to
 * Ollama, which runs locally at zero marginal cost; a wrong guess there just means a re-parse.
 * Resume tailoring defaults to Claude and stays there even if routed to Ollama fails, since a bad
 * tailored resume is the one output a candidate might actually submit. If a call routed to Ollama
 * fails (not running, model not pulled), it falls back to Claude automatically rather than hard
 * failing.
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

  @Value("${ai.routing.tailor-resume:claude}")
  private String tailorResumeProvider;

  @Value("${ai.routing.cover-letter:claude}")
  private String coverLetterProvider;

  @Value("${ai.routing.interview-prep:ollama}")
  private String interviewPrepProvider;

  public AiAssistant(ClaudeApiClient claude, OllamaApiClient ollama, ObjectMapper objectMapper) {
    this.claude = claude;
    this.ollama = ollama;
    this.objectMapper = objectMapper;
  }

  /** True if at least one provider can serve the routine/routed tasks. */
  public boolean available() {
    return claude.isConfigured() || ollama.isConfigured();
  }

  /** Resume tailoring is pinned to Claude regardless of routing (see class docs), so its own
   * availability gate checks Claude specifically rather than "any provider". */
  public boolean claudeAvailable() {
    return claude.isConfigured();
  }

  public ParsedResume parseResume(String resumeText) {
    JsonNode json =
        routedCompleteJson(
            resumeParseProvider,
            "You are a resume parser. Reply with ONLY a JSON object, no prose.",
            """
            Extract structured data from the resume below. Use this exact shape:
            {
              "name": string, "email": string, "phone": string,
              "experience": [{"title","company","startDate","endDate","description"}],
              "education": [{"degree","school","field","graduationYear"}],
              "skills": [{"name","category","proficiency","yearsOfExperience","confidence"}],
              "certifications": [string], "achievements": [string]
            }
            category is one of LANGUAGE, FRAMEWORK, PLATFORM, DATABASE, TOOL, SOFT, OTHER.
            proficiency is one of BEGINNER, INTERMEDIATE, ADVANCED, EXPERT.
            confidence is 0..1. Omit unknown scalar fields rather than guessing.

            RESUME:
            """
                + resumeText);
    return convert(json, ParsedResume.class);
  }

  /**
   * Structures a raw job page (fetched from a pasted URL - JSON-LD, meta tags, or stripped body
   * text) into listing fields. Also cleans the description down to just the posting's prose.
   */
  public ParsedJobPosting parseJobPosting(String rawPageContent) {
    JsonNode json =
        routedCompleteJson(
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

            "jobDescriptionText" must be the posting's own description prose (responsibilities,
            requirements, about the role) with the web-page noise removed - keep the actual wording
            verbatim, don't summarise, but DO restore real structure: a blank line between each
            section (About the company / About the role / Requirements / Benefits / etc.), a short
            heading line for each section, and "- " at the start of each bullet point in a list
            (skills, responsibilities, requirements). Scraped pages often collapse all of this onto
            one line with no punctuation between sentences - reconstruct the paragraph/heading/bullet
            breaks a human would have seen on the actual page, don't just copy the flattened text.
            Omit any scalar field the page doesn't state rather than guessing. If the content is
            clearly not a job posting, return {}.

            RAW PAGE CONTENT:
            """
                + rawPageContent);
    return convert(json, ParsedJobPosting.class);
  }

  /**
   * Scores the candidate's resume prose against one job posting, then returns concrete
   * improvement points and a full LaTeX resume the candidate can paste into Overleaf. Claude is
   * told to only rephrase/reorganise/emphasise the candidate's real, stated experience - never to
   * invent skills or history the resume doesn't support - and to weave in the missing/partial
   * keywords only where the resume text actually backs them up.
   */
  public ResumeTailoringResult tailorResume(
      String jobTitle,
      String company,
      String jobDescriptionText,
      List<String> requiredSkills,
      List<String> missingSkills,
      List<String> partialSkills,
      String resumeText) {
    return tailorResume(jobTitle, company, jobDescriptionText, requiredSkills, missingSkills, partialSkills, resumeText, null);
  }

  /**
   * @param tightenInstruction non-null only on the one-page retry (see JobListingService) - tells
   *     Claude the previous attempt overflowed and to cut content, not just tighten wording.
   */
  public ResumeTailoringResult tailorResume(
      String jobTitle,
      String company,
      String jobDescriptionText,
      List<String> requiredSkills,
      List<String> missingSkills,
      List<String> partialSkills,
      String resumeText,
      String tightenInstruction) {
    JsonNode json =
        routedCompleteJson(
            tailorResumeProvider,
            "You are a resume coach and LaTeX typesetter. Reply with ONLY a JSON object, no prose, no"
                + " markdown fence.",
            """
            Compare the candidate's resume against the job below and produce tailoring output. Shape:
            {
              "improvementPoints": [string],
              "latexResume": string
            }

            Rules:
            - "improvementPoints" is 4-8 short, concrete, actionable bullets telling the candidate what
              to change on their resume for THIS job - e.g. which existing bullet to reword, which
              already-demonstrated-but-unstated skill to surface, what to quantify, what to cut. Do not
              suggest claiming a skill or experience the resume gives no evidence of; if a required
              skill is genuinely absent from their background, say so plainly instead of inventing a way
              to fake it.
            - "latexResume" is a complete, compilable LaTeX document (\\documentclass through
              \\end{document}) using a clean single-column article-style resume layout (no exotic
              packages beyond geometry/enumitem/titlesec/hyperref) built ONLY from the candidate's real
              resume content below - reorganised, reworded and re-prioritised toward this job's required
              skills, but never fabricating employers, titles, dates, or skills absent from the source
              resume. This gets compiled with tectonic (a XeTeX engine), so avoid pdfTeX-only primitives
              (\\pdfgentounicode, \\input{glyphtounicode}). Escape LaTeX special characters (&, %%, $, #,
              _, {, }) found in the candidate's own text. Escape the document as a valid JSON string
              (escape backslashes as \\\\ and newlines as \\n).
            - The resume MUST fit on exactly ONE page. Use compact spacing (tight itemsep/topsep,
              modest margins via geometry) and be concise - prioritise the most relevant bullets for
              this job over including everything. Never let the layout spill onto a second page.
            %s

            JOB:
            Title: %s
            Company: %s
            Required skills: %s
            Skills the candidate is missing: %s
            Skills the candidate partially matches: %s
            Description:
            %s

            CANDIDATE RESUME (verbatim extracted text):
            %s
            """
                .formatted(
                    tightenInstruction == null || tightenInstruction.isBlank() ? "" : tightenInstruction,
                    blank(jobTitle),
                    blank(company),
                    String.join(", ", safe(requiredSkills)),
                    String.join(", ", safe(missingSkills)),
                    String.join(", ", safe(partialSkills)),
                    blank(jobDescriptionText),
                    blank(resumeText)));
    return convert(json, ResumeTailoringResult.class);
  }

  /**
   * Classifies one Gmail message forwarded by batches: is it a job-alert digest (a list of new
   * postings), an application/interview/rejection/offer signal for a job the candidate already
   * applied to, or unrelated mail that happened to match the search query. Told explicitly to
   * favor a lower confidence over a guess, since a wrong auto-applied status silently corrupts the
   * candidate's pipeline.
   */
  public EmailClassification classifyEmail(String fromAddress, String subject, String body) {
    JsonNode json =
        routedCompleteJson(
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
                .formatted(blank(fromAddress), blank(subject), blank(body)));
    return convert(json, EmailClassification.class);
  }

  /** Drafts a cover letter grounded only in the candidate's real resume content - same
   * never-invent constraint as {@link #tailorResume}, since this is a document that gets sent
   * to a real employer. */
  public String generateCoverLetter(String jobTitle, String company, String jobDescriptionText, String resumeText) {
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
            .formatted(blank(jobTitle), blank(company), blank(jobDescriptionText), blank(resumeText)));
  }

  /** Suggests concrete topics to prepare for one interview round, grounded in the job posting and
   * (when it's a technical/system-design round) the candidate's own resume - not just a generic
   * "know data structures" list. */
  public List<String> generateInterviewPrepTopics(
      String roundType, String jobTitle, String company, String jobDescriptionText, String resumeText) {
    JsonNode json =
        routedCompleteJson(
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
                    blank(resumeText)));
    return convert(json, InterviewPrepTopics.class).topics();
  }

  /** Resolves {@code providerName} to a client, calls it, and falls back to Claude if an
   * Ollama-routed call fails (server not running, model not pulled, etc.) instead of failing the
   * whole request - Claude staying reachable is what makes routing routine work to Ollama safe. */
  private JsonNode routedCompleteJson(String providerName, String systemPrompt, String userPrompt) {
    AiClient primary = "ollama".equalsIgnoreCase(providerName) ? ollama : claude;

    if (primary == ollama && !ollama.isConfigured()) {
      log.info("Ollama routed but not enabled - using Claude instead");
      return claude.completeJson(systemPrompt, userPrompt);
    }

    try {
      return primary.completeJson(systemPrompt, userPrompt);
    } catch (RuntimeException exception) {
      if (primary == ollama) {
        log.warn("Ollama call failed ({}), falling back to Claude", exception.getMessage());
        return claude.completeJson(systemPrompt, userPrompt);
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
