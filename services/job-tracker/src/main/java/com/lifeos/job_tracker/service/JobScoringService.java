package com.lifeos.job_tracker.service;

import com.lifeos.common.ai.ClaudeService;
import com.lifeos.job_tracker.domains.entity.Job;
import com.lifeos.job_tracker.domains.record.JobScoreResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
public class JobScoringService {

  private final ClaudeService claudeService;
  private final ObjectMapper objectMapper;

  public JobScoreResult scoreApplication(Job job, String resumeText) {
    String prompt =
        String.format(
            "You are scoring how well a candidate's resume matches a job. "
                + "Job title: %s. Required skills: %s. Nice to have: %s. "
                + "Job description: %s. Candidate resume: %s. "
                + "Score the match from 0-100 based on skill overlap and seniority fit. "
                + "Respond with ONLY a JSON object matching exactly this shape, no other text: "
                + "{\"scorePercentage\": <int>, \"reasoning\": \"<string>\", "
                + "\"recommendedSections\": [\"<string>\", ...], "
                + "\"interviewPrepTopics\": [\"<string>\", ...]}",
            job.getJobTitle(),
            job.getRequiredSkills(),
            job.getNiceToHaveSkills(),
            job.getJobDescription(),
            resumeText);

    String response = claudeService.complete(prompt);

    return objectMapper.readValue(response, JobScoreResult.class);
  }
}
