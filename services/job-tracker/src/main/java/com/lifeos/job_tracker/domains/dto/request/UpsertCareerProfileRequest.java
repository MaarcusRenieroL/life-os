package com.lifeos.job_tracker.domains.dto.request;

public record UpsertCareerProfileRequest(
    String fullName,
    String email,
    String phone,
    String location,
    String githubUrl,
    String linkedinUrl,
    String portfolioUrl,
    String summary) {}
