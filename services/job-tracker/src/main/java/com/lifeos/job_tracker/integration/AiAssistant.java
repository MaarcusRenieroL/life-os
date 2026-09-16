package com.lifeos.job_tracker.integration;

import com.lifeos.job_tracker.domains.record.EmailClassification;
import com.lifeos.job_tracker.domains.record.ParsedJobPosting;
import com.lifeos.job_tracker.domains.record.ParsedResume;
import com.lifeos.job_tracker.domains.record.ResumeTailoringResult;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Domain-shaped prompts on top of {@link ClaudeApiClient}. */
@Component
@RequiredArgsConstructor
public class AiAssistant {

  private final ClaudeApiClient claude;

  public boolean available() {
    return claude.isConfigured();
  }

  public ParsedResume parseResume(String resumeText) {
    return claude.completeJson(
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
            + resumeText,
        ParsedResume.class);
  }

  /**
   * Structures a raw job page (fetched from a pasted URL - JSON-LD, meta tags, or stripped body
   * text) into listing fields. Also cleans the description down to just the posting's prose.
   */
  public ParsedJobPosting parseJobPosting(String rawPageContent) {
    return claude.completeJson(
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
            + rawPageContent,
        ParsedJobPosting.class);
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
    return claude.completeJson(
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
                blank(resumeText)),
        ResumeTailoringResult.class);
  }

  /**
   * Classifies one Gmail message forwarded by batches: is it a job-alert digest (a list of new
   * postings), an application/interview/rejection/offer signal for a job the candidate already
   * applied to, or unrelated mail that happened to match the search query. Told explicitly to
   * favor a lower confidence over a guess, since a wrong auto-applied status silently corrupts the
   * candidate's pipeline.
   */
  public EmailClassification classifyEmail(String fromAddress, String subject, String body) {
    return claude.completeJson(
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

  private static String blank(String value) {
    return value == null || value.isBlank() ? "(not provided)" : value;
  }

  private static List<String> safe(List<String> list) {
    return list == null ? List.of() : list;
  }
}
