package com.lifeos.job_tracker.domains.dto.response;

import com.lifeos.job_tracker.domains.entity.JobListing;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record JobListingResponse(
    UUID id,
    UUID companyId,
    String title,
    String company,
    String location,
    String workModel,
    String url,
    String source,
    String jobDescriptionText,
    BigDecimal salaryMin,
    BigDecimal salaryMax,
    String currency,
    LocalDate postedDate,
    LocalDate deadline,
    String seniorityLevel,
    List<String> requiredSkills,
    List<String> niceToHaveSkills,
    String visaSponsorship,
    String companySize,
    String growthStage,
    String industry,
    List<String> tags,
    String parseStatus,
    Integer fitScore,
    Map<String, Object> fitExplanation,
    String status,
    Instant createdAt,
    List<String> tailoredImprovementPoints,
    String tailoredLatexResume,
    String notes,
    LocalDate appliedAt,
    String rejectionReason,
    BigDecimal offerAmount,
    LocalDate offerDeadline,
    String offerNotes,
    String coverLetterText) {

  public static JobListingResponse from(JobListing job) {
    return new JobListingResponse(
        job.getId(),
        job.getCompanyId(),
        job.getTitle(),
        job.getCompany(),
        job.getLocation(),
        job.getWorkModel() == null ? null : job.getWorkModel().name(),
        job.getUrl(),
        job.getSource(),
        job.getJobDescriptionText(),
        job.getSalaryMin(),
        job.getSalaryMax(),
        job.getCurrency(),
        job.getPostedDate(),
        job.getDeadline(),
        job.getSeniorityLevel() == null ? null : job.getSeniorityLevel().name(),
        job.getRequiredSkills(),
        job.getNiceToHaveSkills(),
        job.getVisaSponsorship() == null ? null : job.getVisaSponsorship().name(),
        job.getCompanySize() == null ? null : job.getCompanySize().name(),
        job.getGrowthStage() == null ? null : job.getGrowthStage().name(),
        job.getIndustry(),
        job.getTags(),
        job.getParseStatus() == null ? null : job.getParseStatus().name(),
        job.getFitScore(),
        job.getFitExplanation(),
        job.getStatus() == null ? null : job.getStatus().name(),
        job.getCreatedAt(),
        job.getTailoredImprovementPoints(),
        job.getTailoredLatexResume(),
        job.getNotes(),
        job.getAppliedAt(),
        job.getRejectionReason(),
        job.getOfferAmount(),
        job.getOfferDeadline(),
        job.getOfferNotes(),
        job.getCoverLetterText());
  }
}
