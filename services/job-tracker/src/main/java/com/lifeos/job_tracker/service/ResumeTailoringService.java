package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.entity.Job;
import com.lifeos.job_tracker.domains.record.OllamaGenerateRequest;
import com.lifeos.job_tracker.domains.record.OllamaGenerateResponse;
import com.lifeos.job_tracker.domains.record.ResumeTailoringResult;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
public class ResumeTailoringService {

  @Value("${ollama.model}")
  private String ollamaModel;

  private final RestClient ollamaRestClient;
  private final ObjectMapper objectMapper;

  public ResumeTailoringResult tailorResume(Job job, String resumeText) {
    String prompt =
        String.format(
            "You are tailoring a candidate's resume for a specific job. Do NOT invent new"
                + " experience, skills, or facts that aren't already present in the resume -"
                + " only rewrite, reorder, and re-emphasize what's already there to better match"
                + " the job. "
                + "Job title: %s. Required skills: %s. Nice to have skills: %s. "
                + "Job description: %s. Candidate's original resume: %s. "
                + "Respond with ONLY a JSON object matching exactly this shape, no other text: "
                + "{\"summary\": \"<a 2-3 sentence professional summary tailored to this job>\","
                + " \"experienceBullets\": [\"<string>\", ...], "
                + "\"skillsHighlight\": [\"<string>\", ...]}",
            job.getJobTitle(),
            job.getRequiredSkills(),
            job.getNiceToHaveSkills(),
            job.getJobDescription(),
            resumeText);

    OllamaGenerateRequest request = new OllamaGenerateRequest(ollamaModel, prompt, false, "json");

    OllamaGenerateResponse response =
        ollamaRestClient
            .post()
            .uri("/api/generate")
            .body(request)
            .retrieve()
            .body(OllamaGenerateResponse.class);

    return objectMapper.readValue(response.response(), ResumeTailoringResult.class);
  }
}
