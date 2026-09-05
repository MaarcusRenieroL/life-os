package com.lifeos.job_tracker.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.job_tracker.domains.record.EmailClassification;
import com.lifeos.job_tracker.domains.record.ParsedJobDescription;
import com.lifeos.job_tracker.domains.record.ParsedResume;
import com.lifeos.job_tracker.domains.record.TailoredResumeSections;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Domain-shaped prompts on top of {@link ClaudeApiClient}. */
@Component
@RequiredArgsConstructor
public class AiAssistant {

  private final ClaudeApiClient claude;
  private final ObjectMapper objectMapper;

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

  public ParsedJobDescription parseJobDescription(String jobDescription) {
    return claude.completeJson(
        "You parse job descriptions. Reply with ONLY a JSON object, no prose.",
        """
        Extract this shape from the job description:
        {
          "requiredSkills": [string], "niceToHaveSkills": [string],
          "seniorityLevel": one of INTERN|JUNIOR|MID|SENIOR|STAFF|LEAD|PRINCIPAL,
          "workModel": one of ONSITE|HYBRID|REMOTE,
          "industry": string, "techStack": [string]
        }

        JOB DESCRIPTION:
        """
            + jobDescription,
        ParsedJobDescription.class);
  }

  public EmailClassification classifyEmail(String fromAddress, String subject, String body) {
    return claude.completeJson(
        "You classify job-search emails. Reply with ONLY a JSON object, no prose.",
        """
        Classify this email. Shape:
        {
          "category": one of RECRUITER_OUTREACH|INTERVIEW_INVITE|REJECTION|CONFIRMATION|OFFER|OTHER,
          "company": string, "recruiterName": string, "jobTitle": string, "jobUrl": string,
          "interviewDate": ISO-8601 instant or null, "meetingLink": string, "salary": string
        }
        Omit fields you cannot determine.

        FROM: %s
        SUBJECT: %s
        BODY:
        %s
        """
            .formatted(fromAddress, subject, body),
        EmailClassification.class);
  }

  public String generateTailoredResume(String baseResumeText, String jobDescription, String instruction) {
    return claude.complete(
        "You are an expert resume writer. Output the tailored resume as clean Markdown only.",
        """
        Rewrite the base resume to target the job description: reorder experience by
        relevance, weave in the job's keywords truthfully, and calibrate tone to the
        seniority. Do not invent experience.
        %s

        === BASE RESUME ===
        %s

        === TARGET JOB ===
        %s
        """
            .formatted(
                instruction == null || instruction.isBlank()
                    ? ""
                    : "Additional instruction from the candidate: " + instruction,
                baseResumeText,
                jobDescription));
  }

  public String generateColdEmail(
      String recruiterName,
      String jobTitle,
      String company,
      List<String> matchingSkills,
      String jobHighlights) {
    return claude.complete(
        "You write concise, professional recruiter outreach emails. Output the email body only.",
        """
        Write a short cold email (120 words max) to %s about the %s role at %s.
        Mention 2-3 of these matching skills: %s.
        Reference this aspect of the role: %s.
        Sign off as "[Your name]".
        """
            .formatted(
                recruiterName == null ? "the hiring team" : recruiterName,
                jobTitle,
                company,
                String.join(", ", matchingSkills),
                jobHighlights == null ? "the team's work" : jobHighlights));
  }

  public String generateLinkedInMessage(
      String personName, String jobTitle, String company, List<String> matchingSkills) {
    return claude.complete(
        "You write friendly, brief LinkedIn outreach messages (60-80 words). Output the message only.",
        """
        Write a LinkedIn message to %s about the %s role at %s.
        Mention these skills naturally: %s.
        """
            .formatted(
                personName == null ? "the hiring manager" : personName,
                jobTitle,
                company,
                String.join(", ", matchingSkills)));
  }

  public String generateReferralMessage(
      String contactName, String jobTitle, String company, List<String> matchingSkills) {
    return claude.complete(
        "You write warm, casual referral-request messages to people the sender already knows."
            + " Output the message only.",
        """
        Write a short message to %s asking if they'd be open to referring me for the
        %s role at %s. Mention my background in %s. Keep it low-pressure.
        """
            .formatted(
                contactName, jobTitle, company, String.join(", ", matchingSkills)));
  }

  /**
   * Tailors a resume's sections (same shape as {@code resume_sections}, one entry per section) to a
   * job description, optionally nudged by free-text instructions ("emphasize AWS").
   */
  public List<TailoredResumeSections.TailoredSection> tailorResumeSections(
      List<Map<String, Object>> sections, String jobDescription, String instruction) {
    TailoredResumeSections result =
        claude.completeJson(
            "You tailor resumes for a specific job. Reply with ONLY a JSON object, no prose.",
            """
            Reorder and lightly rewrite the resume sections below to target the job description:
            put the most relevant experience/skills first, weave in the job's real keywords
            truthfully, and calibrate seniority. Do not invent experience, companies, dates, or
            skills that aren't already present. Keep every section that was given, in the same
            JSON shape, just reordered/rewritten content.
            %s

            Reply shape: {"sections": [{"sectionType": string, "title": string|null, "content": [...]}]}

            SECTIONS (JSON):
            %s

            JOB DESCRIPTION:
            %s
            """
                .formatted(
                    instruction == null || instruction.isBlank()
                        ? ""
                        : "Additional instruction from the candidate: " + instruction,
                    toJson(sections),
                    jobDescription),
            TailoredResumeSections.class);
    return result.sections() == null ? List.of() : result.sections();
  }

  /** Full cover letter text (Markdown-ish plain text, not JSON). */
  public String generateCoverLetter(
      String jobTitle,
      String company,
      String jobDescription,
      String resumeSummary,
      String tone,
      String style,
      String templateStructure) {
    return claude.complete(
        "You write compelling, honest cover letters. Output the letter body only - no subject"
            + " line, no explanation, no markdown fences.",
        """
        Write a cover letter for the %s role at %s. Tone: %s. Style: %s.%s

        Structure it around: a greeting, a hook (why this company/role specifically), mapping
        the candidate's real background to the job's requirements, one or two concrete examples
        from their experience, and a closing call-to-action. Do not invent experience that isn't
        in the candidate background below.

        CANDIDATE BACKGROUND:
        %s

        JOB DESCRIPTION:
        %s
        """
            .formatted(
                jobTitle,
                company,
                tone,
                style,
                templateStructure == null || templateStructure.isBlank()
                    ? ""
                    : " Follow this section structure: " + templateStructure,
                resumeSummary,
                jobDescription));
  }

  public List<String> extractJobKeywords(String jobDescription) {
    JsonNode node =
        claude.completeJson(
            "You extract ATS-relevant keywords from job descriptions. Reply with ONLY a JSON"
                + " array of strings.",
            """
            List the 15-25 most important ATS keywords (skills, tools, certifications, methodologies)
            from this job description, most important first. Return a JSON array of short strings.

            JOB DESCRIPTION:
            %s
            """
                .formatted(jobDescription));

    List<String> keywords = new ArrayList<>();
    if (node.isArray()) {
      node.forEach(element -> keywords.add(element.asText()));
    }
    return keywords;
  }

  public List<String> suggestAccomplishments(String sectionType, String context) {
    JsonNode node =
        claude.completeJson(
            "You suggest resume accomplishment bullets. Reply with ONLY a JSON array of strings.",
            """
            Suggest 3-5 strong, metrics-oriented accomplishment bullets for a resume %s section,
            grounded in this context (do not invent facts not implied by it). Return a JSON array
            of short bullet strings, each starting with a strong verb.

            CONTEXT:
            %s
            """
                .formatted(sectionType, context));

    List<String> suggestions = new ArrayList<>();
    if (node.isArray()) {
      node.forEach(element -> suggestions.add(element.asText()));
    }
    return suggestions;
  }

  private String toJson(Object value) {
    try {
      return objectMapper.writeValueAsString(value);
    } catch (Exception exception) {
      throw new IllegalArgumentException("Failed to serialize value for prompt", exception);
    }
  }

  public List<String> generateInterviewTopics(String jobDescription, String interviewType) {
    JsonNode node =
        claude.completeJson(
            "You prepare interview topic checklists. Reply with ONLY a JSON array of strings.",
            """
            List 6-10 concrete topics to prepare for a %s interview, given this job
            description. Return a JSON array of short strings.

            JOB DESCRIPTION:
            %s
            """
                .formatted(interviewType, jobDescription));

    List<String> topics = new ArrayList<>();
    if (node.isArray()) {
      node.forEach(element -> topics.add(element.asText()));
    }
    return topics;
  }
}
