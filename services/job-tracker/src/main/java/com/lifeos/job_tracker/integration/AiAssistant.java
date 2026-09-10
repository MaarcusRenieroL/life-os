package com.lifeos.job_tracker.integration;

import com.lifeos.job_tracker.domains.record.ParsedJobPosting;
import com.lifeos.job_tracker.domains.record.ParsedResume;
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
        "jobDescriptionText" must be the posting's own description prose (responsibilities,
        requirements, about the role) with the web-page noise removed - keep it verbatim, don't
        summarise. Omit any scalar field the page doesn't state rather than guessing. If the
        content is clearly not a job posting, return {}.

        RAW PAGE CONTENT:
        """
            + rawPageContent,
        ParsedJobPosting.class);
  }
}
