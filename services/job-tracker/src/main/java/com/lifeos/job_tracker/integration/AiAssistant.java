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

  @Value("${ai.routing.referral-message:claude}")
  private String referralMessageProvider;

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

    ParsedResume parsed = routedCompleteJson(resumeParseProvider, systemPrompt, userPrompt, ParsedResume.class);

    // Ollama can return a syntactically valid response with zero skills for resume text that
    // plainly has dozens - no exception, so the usual fallback-on-failure path never triggers,
    // and this silently zeroes out every downstream score. A real resume this long having
    // genuinely no skills is implausible, so treat it as a parse failure and retry on Claude.
    boolean suspicientlyEmpty =
        (parsed.skills() == null || parsed.skills().isEmpty()) && resumeText != null && resumeText.length() > 200;
    if (suspicientlyEmpty && "ollama".equalsIgnoreCase(resumeParseProvider) && claude.isConfigured()) {
      log.warn("Ollama parsed 0 skills from a {}-char resume - retrying on Claude", resumeText.length());
      parsed = convert(claude.completeJson(systemPrompt, userPrompt), ParsedResume.class);
    }
    return parsed;
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
    return routedCompleteJson(
        tailorResumeProvider,
        "You are a resume coach and LaTeX typesetter. Reply with ONLY a JSON object, no prose, no"
            + " markdown fence.",
        """
            Tailor the candidate's resume to the job below. This is a one-shot task - there is no
            second attempt, so use every honest angle you can find on the first try. Shape:
            {
              "improvementPoints": [string],
              "gapsVsJd": [string],
              "inferredClaims": [string],
              "latexResume": string
            }

            GROUND RULES (non-negotiable):
            - Never fabricate. Only include skills, tools, or achievements the candidate profile below
              actually states. Tailoring means reordering and reweighting - leading with whichever real
              bullets/skills are most relevant to this job, and rephrasing existing bullets into this
              job's terminology where that rephrasing is still honestly accurate - never inventing a new
              claim. If the job wants something genuinely absent from the profile, do not add it.
            - Where the job's required-skill wording differs only cosmetically from how the candidate
              already describes it (e.g. job says "Tailwind", candidate says "Tailwind CSS"; job says a
              version qualifier the candidate's tooling already covers), use the job's own phrasing -
              that is honest alignment, not fabrication, and it is exactly what an ATS keyword scan
              rewards.
            - Every hyperlink in the output must be copied verbatim, character-for-character, from a
              link that already appears in the candidate profile below. If a project has no link in
              the profile, render its name as plain bold text with NO \\href and no URL at all - do
              not construct one from the candidate's GitHub username plus the project's name (e.g.
              github.com/user/project-name-in-lowercase is a guess, not a fact, even if it looks
              plausible or the candidate's real GitHub profile is linked elsewhere).
            - Keep every factual detail (dates, company names, metrics) exactly as given in the profile.
            - "improvementPoints" (4-8 items): what you emphasized or reordered and why, tied to
              specific job requirements.
            - "gapsVsJd": required or nice-to-have items from this job that the candidate's real
              background does not support. Say so plainly - do not soften it into something that sounds
              like a workaround.
            - "inferredClaims": any rephrasing in the output that goes beyond a straightforward reording
              of something already in the profile (e.g. inferring "code reviews" from "quality
              pipeline") - flag it here so the candidate can confirm or correct it before sending this
              out. Empty array if every line is a direct rewording.

            STYLE & VOICE:
            - No em dashes (—) or en dashes (–) anywhere - not in bullet prose, not in date
              ranges, not in headers. Use a comma, a period splitting into two sentences, a colon,
              parentheses, or the word "to" for date ranges (e.g. "Aug 2024 to Present") instead. A
              plain hyphen (-) is fine where one is genuinely needed.
            - Do not write like an LLM. Cut buzzwords and filler: "leverage", "seamless", "robust",
              "cutting-edge", "dynamic", "synergy", "spearhead", "utilize", "in order to", and similar.
              Vary sentence rhythm and structure across bullets - don't make every bullet follow the
              identical "verb + object + tool + outcome" template; let a few lead with a scope, a
              problem, or a number instead of always a gerund or past-tense verb. Before finalizing,
              read it back for tone - if a line reads like keyword-stuffed SEO copy, rewrite it.
            - ATS-friendly: standard section headers, no tables/columns, no images or icons standing in
              for text.
            - "latexResume" is a complete, compilable LaTeX document. This gets compiled with tectonic
              (a XeTeX engine), so avoid pdfTeX-only primitives (\\pdfgentounicode,
              \\input{glyphtounicode}) - drop those two lines from the template below even though the
              original has them. Escape LaTeX special characters (&, %%, $, #, _, {, }) found in the
              candidate's own text. Escape the document as a valid JSON string (escape backslashes as
              \\\\ and newlines as \\n).
            - Always use this exact template (the industry-standard "Jake's Resume" layout - ATS-safe,
              no tables, no columns, ~11pt), adapting only the section content to the candidate profile
              and dropping any section the profile has nothing for (e.g. no Projects section if the
              profile lists no projects):
              \\documentclass[letterpaper,11pt]{article}
              \\usepackage{latexsym}
              \\usepackage[empty]{fullpage}
              \\usepackage{titlesec}
              \\usepackage{marvosym}
              \\usepackage[usenames,dvipsnames]{color}
              \\usepackage{verbatim}
              \\usepackage{enumitem}
              \\usepackage[hidelinks]{hyperref}
              \\usepackage{fancyhdr}
              \\usepackage[english]{babel}
              \\usepackage{tabularx}
              \\pagestyle{fancy}
              \\fancyhf{}
              \\fancyfoot{}
              \\renewcommand{\\headrulewidth}{0pt}
              \\renewcommand{\\footrulewidth}{0pt}
              \\addtolength{\\oddsidemargin}{-0.5in}
              \\addtolength{\\evensidemargin}{-0.5in}
              \\addtolength{\\textwidth}{1in}
              \\addtolength{\\topmargin}{-.5in}
              \\addtolength{\\textheight}{1.0in}
              \\urlstyle{same}
              \\raggedbottom
              \\raggedright
              \\setlength{\\tabcolsep}{0in}
              \\titleformat{\\section}{\\vspace{-4pt}\\scshape\\raggedright\\large}{}{0em}{}[\\color{black}\\titlerule \\vspace{-5pt}]
              \\newcommand{\\resumeItem}[1]{\\item\\small{{#1 \\vspace{-2pt}}}}
              \\newcommand{\\resumeSubheading}[4]{\\vspace{-2pt}\\item\\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}\\textbf{#1} & #2 \\\\ \\textit{\\small#3} & \\textit{\\small #4} \\\\\\end{tabular*}\\vspace{-7pt}}
              \\newcommand{\\resumeProjectHeading}[2]{\\item\\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}\\small#1 & #2 \\\\\\end{tabular*}\\vspace{-7pt}}
              \\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]}
              \\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
              \\newcommand{\\resumeItemListStart}{\\begin{itemize}}
              \\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}
              \\begin{document}
              \\begin{center}
                  \\textbf{\\Huge \\scshape CANDIDATE NAME} \\\\ \\vspace{1pt}
                  \\small PHONE $|$ \\href{mailto:EMAIL}{\\underline{EMAIL}} $|$ LOCATION $|$ \\href{URL}{\\underline{DISPLAY}} $|$ ...
              \\end{center}
              \\section{Experience}
                \\resumeSubHeadingListStart
                  \\resumeSubheading{Title}{Dates}{Company}{Location}
                  \\resumeItemListStart
                    \\resumeItem{Bullet text.}
                  \\resumeItemListEnd
                \\resumeSubHeadingListEnd
              \\section{Projects}
                  \\resumeSubHeadingListStart
                    \\resumeProjectHeading{\\textbf{Name} $|$ \\emph{Tech, stack, here}}{Dates}
                    \\resumeItemListStart
                      \\resumeItem{Bullet text.}
                    \\resumeItemListEnd
                  \\resumeSubHeadingListEnd
              \\section{Education}
                \\resumeSubHeadingListStart
                  \\resumeSubheading{School}{Location}{Degree}{Dates}
                \\resumeSubHeadingListEnd
              \\section{Technical Skills}
               \\begin{itemize}[leftmargin=0.15in, label={}]
                  \\small{\\item{
                   \\textbf{Category}{: item, item, item} \\\\
                   \\textbf{Category}{: item, item, item}
                  }}
               \\end{itemize}
              \\end{document}
              Put sections in whatever order best leads with this candidate's strongest match for
              this job (Experience first is typical when it's the stronger fit; Projects first if
              they're more relevant than the job history). Keep \\resumeSubheading's 4 arguments in
              that exact order (title, dates, company, location) - swapping them silently breaks the
              layout. Only \\href real profile links; render a project with no link as plain
              \\textbf{Name} with no \\href.
            - Technical Skills: group into 3-5 labeled categories (e.g. Languages, Frameworks,
              Databases, Cloud/DevOps Tools, Testing) matching the categories already given in the
              candidate profile below - never dump every skill into one undifferentiated
              comma-separated line with no structure.
            - The resume MUST fit on exactly ONE page and should use the page well - avoid a large
              empty gap at the bottom (a candidate with less content should still fill the page through
              the template's own spacing, not by inventing content or leaving it visibly sparse) while
              never spilling onto a second page. Prioritise the most relevant bullets for this job over
              including everything if it's genuinely too much for one page.
            %s

            JOB:
            Title: %s
            Company: %s
            Required skills: %s
            Skills the candidate is missing: %s
            Skills the candidate partially matches: %s
            Description:
            %s

            CANDIDATE PROFILE (verbatim - contact info, summary, work experience, projects with real
            links, and skills):
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

  /** Drafts a short outreach message asking a contact for a referral - grounded only in the
   * candidate's real resume, same never-invent constraint as {@link #generateCoverLetter}. This is
   * always a draft the candidate reviews and sends themselves; nothing here ever contacts anyone
   * automatically. */
  public String generateReferralMessage(
      String contactName,
      String contactTitle,
      String relationship,
      String jobTitle,
      String company,
      String resumeText) {
    return routedComplete(
        referralMessageProvider,
        "You draft short referral-request messages (for LinkedIn or email). Reply with ONLY the"
            + " message text, no subject line, no prose before or after.",
        """
        Draft a short (3-5 sentence), warm but direct message asking %s%s for a referral for the
        role below, using ONLY real experience from the candidate's resume - never invent
        employers, projects, skills, or achievements. Reference 1 concrete, relevant thing from
        the candidate's actual background. Acknowledge the relationship context naturally if given.
        End with a clear, low-friction ask (e.g. "would you be open to referring me?"). No
        generic filler, no placeholders left unfilled.

        CONTACT: %s%s
        RELATIONSHIP TO CANDIDATE: %s

        JOB:
        Title: %s
        Company: %s

        CANDIDATE RESUME (verbatim extracted text):
        %s
        """
            .formatted(
                blank(contactName),
                contactTitle == null || contactTitle.isBlank() ? "" : " (" + contactTitle + ")",
                blank(contactName),
                contactTitle == null || contactTitle.isBlank() ? "" : ", " + contactTitle,
                blank(relationship),
                blank(jobTitle),
                blank(company),
                blank(resumeText)));
  }

  /** Resolves {@code providerName} to a client, calls it, and converts the result to {@code type}.
   * Falls back to Claude if an Ollama-routed call fails outright (server not running, model not
   * pulled) OR returns JSON that won't map to {@code type} - a local 7B model occasionally produces
   * malformed shapes (e.g. nesting an object where a plain string field was asked for) on complex
   * input, and that's just as much a "this routed call didn't work" case as a network failure.
   * Claude staying reachable is what makes routing routine work to Ollama safe either way. */
  private <T> T routedCompleteJson(String providerName, String systemPrompt, String userPrompt, Class<T> type) {
    AiClient primary = "ollama".equalsIgnoreCase(providerName) ? ollama : claude;

    if (primary == ollama && !ollama.isConfigured()) {
      log.info("Ollama routed but not enabled - using Claude instead");
      return convert(claude.completeJson(systemPrompt, userPrompt), type);
    }

    try {
      return convert(primary.completeJson(systemPrompt, userPrompt), type);
    } catch (RuntimeException exception) {
      if (primary == ollama) {
        log.warn("Ollama call failed or returned unmappable JSON ({}), falling back to Claude", exception.getMessage());
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
