package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.dto.response.JobResponse;
import com.lifeos.job_tracker.domains.entity.Job;
import com.lifeos.job_tracker.exception.JobNotFoundException;
import com.lifeos.job_tracker.repository.JobRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class JobService {

  private final JobRepository jobRepository;

  public List<JobResponse> getAll(Authentication authentication) {
    UUID userId = (UUID) authentication.getPrincipal();

    return jobRepository.findAllByUserIdOrderByCreatedAtDesc(userId).stream()
        .map(this::toResponse)
        .toList();
  }

  public JobResponse get(Authentication authentication, UUID id) {
    UUID userId = (UUID) authentication.getPrincipal();

    return toResponse(
        jobRepository.findByIdAndUserId(id, userId).orElseThrow(() -> new JobNotFoundException(id)));
  }

  private JobResponse toResponse(Job job) {
    return JobResponse.builder()
        .id(job.getId())
        .company(job.getCompany())
        .jobTitle(job.getJobTitle())
        .location(job.getLocation())
        .country(job.getCountry())
        .workModel(job.getWorkModel())
        .salaryMin(job.getSalaryMin())
        .salaryMax(job.getSalaryMax())
        .currency(job.getCurrency())
        .jobUrl(job.getJobUrl())
        .jobDescription(job.getJobDescription())
        .source(job.getSource())
        .sourceUrl(job.getSourceUrl())
        .requiredSkills(job.getRequiredSkills())
        .niceToHaveSkills(job.getNiceToHaveSkills())
        .seniority(job.getSeniority())
        .status(job.getStatus())
        .tags(job.getTags())
        .notes(job.getNotes())
        .createdAt(job.getCreatedAt())
        .updatedAt(job.getUpdatedAt())
        .build();
  }
}
