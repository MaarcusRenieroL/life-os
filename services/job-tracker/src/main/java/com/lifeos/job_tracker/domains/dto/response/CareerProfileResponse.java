package com.lifeos.job_tracker.domains.dto.response;

import com.lifeos.job_tracker.domains.entity.CareerProfile;
import com.lifeos.job_tracker.domains.record.EducationEntry;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CareerProfileResponse(
    UUID userId,
    String fullName,
    String email,
    String phone,
    String location,
    String githubUrl,
    String linkedinUrl,
    String portfolioUrl,
    String summary,
    List<EducationEntry> education,
    List<String> achievements,
    Instant createdAt,
    Instant updatedAt) {

  public static CareerProfileResponse from(CareerProfile profile) {
    return new CareerProfileResponse(
        profile.getUserId(),
        profile.getFullName(),
        profile.getEmail(),
        profile.getPhone(),
        profile.getLocation(),
        profile.getGithubUrl(),
        profile.getLinkedinUrl(),
        profile.getPortfolioUrl(),
        profile.getSummary(),
        profile.getEducation(),
        profile.getAchievements(),
        profile.getCreatedAt(),
        profile.getUpdatedAt());
  }
}
